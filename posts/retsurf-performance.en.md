By [[retsurf-controls|the controls post]] the browser loads modern sites and the whole
UI is driven from a gamepad. You could stop there — if it weren't for the 1 GB devices.
This post is about making it not just *run*, but stay usable on hardware that gives you
almost nothing to work with.

The constraint that shapes everything below is one most desktop developers never have to
think about: unified memory.

These SoCs have no dedicated VRAM. The GPU keeps its framebuffers, WebRender's tiles,
decoded images, and GL textures in the same 0.5–4 GB pool the CPU allocates the
JavaScript heap, the DOM, and everything else from. Here "use less GPU memory" and "leave
more memory for the page" aren't two goals — they're the same one. Every megabyte the
renderer holds is taken away from the page. On the smallest devices that entire budget is
just 1 GB, shared with the operating system on top of that.

The second constraint is the CPU: comparatively weak, in-order Cortex-A35, A53, and A55
cores with small L1 caches. They don't hide cache misses behind aggressive speculation, so
wasted work here doesn't just cost performance — it costs dropped frames and higher power
draw.

Everything that follows is grounded in actually reading the real code and Servo's sources
before treating any optimization as justified. Most of the value wasn't in finding new
optimizations — it was in understanding what *not* to do. The changes worth keeping were
few, but each one is a permanent win.

This post is about both: the optimizations that landed, and the ones I deliberately turned
down.

## The cheapest optimization is the allocation you never make

Shrinking an allocation saves memory once. Removing it entirely stops you paying for it on
every frame, every resize, and every startup. So the first pass through the code became a
hunt for work the renderer did regularly with nothing to show for it.

The first such find was the FBO's depth renderbuffer. WebRender draws flat, pre-sorted 2D
tiles, and the depth test is never enabled anywhere in the pipeline. A single color
attachment is enough for a complete framebuffer, so the depth buffer was pure overhead:
about 2.6 MB of unified memory at 1280×720, allocated and reallocated on every resize for a
mechanism that never ran.

With it gone, the `allocate` path creates only the color texture (`src/platform/render.rs`):

```rust
/// (Re)allocate the color texture at `size` and attach it to the FBO. The GL
/// object names are kept stable, so any egui texture registration of the
/// color texture stays valid across resizes. No depth/stencil attachment:
/// WebRender draws flat 2D tiles with the depth test never enabled, so
/// `COLOR_ATTACHMENT0` alone makes the FBO complete.
fn allocate(&self, size: PhysicalSize<u32>) {
```

The same principle turned up elsewhere. OpenGL returns image rows bottom-up, so a frame
has to be flipped before it's saved. The old code did that by first cloning the entire
image buffer; the new one just swaps row pairs through a single stride-sized scratch
buffer, shedding roughly 3.5 MB of transient allocation on every readback
(`src/platform/render.rs`):

```rust
// Flip vertically: GL returns rows bottom-up. Swap row pairs through a
// single stride-sized scratch buffer instead of cloning the whole frame
// (an odd middle row is already in place, so the half loop skips it).
let stride = w as usize * 4;
let h = h as usize;
let mut tmp = vec![0u8; stride];
for row in 0..h / 2 {
    let top = row * stride;
    let bot = (h - row - 1) * stride;
    tmp.copy_from_slice(&pixels[top..top + stride]);
    pixels.copy_within(bot..bot + stride, top);
    pixels[bot..bot + stride].copy_from_slice(&tmp);
}
```

The next optimization pays off not on resize but on every frame. The color texture egui
uses to composite the browser switched from `LINEAR` to `NEAREST` (`src/platform/render.rs`):

```rust
/// NEAREST is correct because the composite is 1:1 (no scaling, see `ui/mod.rs`),
/// so LINEAR would only burn texture bandwidth without changing the output.
set(gl::TEXTURE_MAG_FILTER, gl::NEAREST);
set(gl::TEXTURE_MIN_FILTER, gl::NEAREST);
```

The reason is simple: egui draws that texture at 1:1 — one texel to one pixel. In that mode
bilinear filtering still reads four neighboring texels to produce a result identical to
sampling one. On a shared-bus memory system that's tens of megabytes of needless traffic
every second, with no gain in image quality. `NEAREST` produces the same pixels for less
work.

None of these looks impressive on its own. But that's the point: they add no complexity,
ask for nothing in return, and keep paying off on every frame. The best optimizations are
the ones you can afterward simply forget about.

## Tuning an engine you didn't write

Rewriting SpiderMonkey or WebRender is an enormous undertaking. But Servo exposes dozens of
preferences, and on constrained hardware they become a real optimization lever — if you
understand what's actually limiting the device.

retsurf collects them into memory profiles (Embedded, Tight, Balanced, Generous, Android,
Desktop), selected automatically from the amount of RAM. Each profile is not just a pile of
individual flags but a coherent set of trade-offs.

The JIT settings are the clearest example of hardware dictating the answer. The instinct on
a 1 GB device is to disable the JIT: it generates machine code and eats memory, after all.
On these SoCs that turns out to be a mistake. The Cortex-A35/A53/A55 are in-order cores, and
running JavaScript without the baseline JIT is several times slower.

So the Tight profile, aimed at roughly 1 GB of RAM, keeps the baseline JIT but disables the
optimizing compiler (Ion) and its wasm counterpart. That cuts the memory spent on generated
code without collapsing performance (`src/browser/memory.rs`):

```rust
// Drop the heavy optimizing JIT; keep baseline JIT. Also drop wasm Ion to
// cut compile-time CPU/memory.
p.js_ion_enabled = false;
p.js_wasm_ion_enabled = false;
```

Of all the GC parameters, only one made a noticeable difference in real use — the
incremental slice length. Incremental GC runs in short, time-boxed steps; if one step
overruns the frame budget, a frame is lost. The desktop default of 10 ms is fine on fast
processors but already noticeable on a Cortex-A35, so the tighter profiles shrink the limit
step by step:

```rust
p.js_mem_gc_incremental_slice_ms = 4; // ms — keep a GC step well under a frame
```

Embedded 3, Tight 4, Balanced 6, Generous 8, Android 5; Desktop left at 10. Like
`NEAREST`, this one still wants a real RK3326/H700 benchmark to tune — the direction is
certain, the exact number isn't.

## The cost of an immediate-mode UI

egui uses an immediate-mode UI: the entire interface is rebuilt every frame. That keeps the
code simpler, but it forces you to pay attention to anything done inside a frame without
needing to be.

A good example is the home screen. For each speed-dial tile it derives a short brand label
for the site, and to do that it parses a `Url`. Repeating that parse 60 times a second for
a bookmark set that changes maybe once a week is exactly the kind of invisible waste
in-order cores punish hardest. A simple thread-local cache is enough here (`src/ui/home.rs`):

```rust
fn brand_label(url: &str) -> String {
    BRAND_LABELS.with(|cache| {
        if let Some(label) = cache.borrow().get(url) {
            return label.clone();
        }
        let label = compute_brand_label(url);
        cache.borrow_mut().insert(url.to_owned(), label.clone());
        label
    })
}
```

But the more interesting part is the caches I deliberately chose not to add.

The first candidate was caching the on-screen-keyboard key labels. At first glance the idea
looked obvious: dozens of keys recomputed every frame. But it turned out egui already caches
text shaping in its internal galley cache, and only tessellation runs per frame — and that
can't be avoided anyway. The only thing left to save was a few small string allocations.
Getting them would mean introducing a cross-frame `Galley` cache with intricate invalidation
logic on every scale change. The complexity was out of all proportion to the win.

The second candidate was caching finished `Galley`s for the hint bar. But here the problem
is worse: a `Galley` stops being valid the moment `pixels_per_point` changes. Zoom or
rotation rebuilds the font atlas, and the text's UV coordinates shift with it. The win would
have been re-laying just a few short strings; the price would have been a whole class of
hard-to-catch bugs from stale text caches.

A cache is never free. It requires an invalidation rule, and a wrong invalidation rule is
already a bug. So in immediate mode you should cache only genuinely expensive operations,
like URL parsing, and not what the framework already optimizes well itself.

## Writing to disk without waking the device

History was originally written to disk on every navigation — the whole `history.toml`,
after each loaded page. On a device with a slow SD card that meant both needless I/O and
needless flash wear.

The obvious fix is to stop writing immediately. Instead, recording just marks the history
dirty, and the actual save is deferred (`src/data/history.rs`):

```rust
/// Record a visit ... Marks the store dirty (the disk write is
/// deferred — see [`Self::flush`]) rather than rewriting the file per visit.
pub fn record(&mut self, url: &str) {
    // ...
    self.dirty = true;
}
```

The real question here isn't *how* to defer the write, but *when* to perform it.

The browser's main loop is built around a blocking `wait_event`: when the user has nothing
to do, the process genuinely sleeps rather than waking dozens of times a second to check
timers. That, more than anything, is what gives the device reasonable battery life.

So the textbook solution — "flush the history periodically on an idle timer" — is the wrong
one here. Such a timer would inevitably wake the loop on a schedule, destroying the very
optimization the power model rests on.

Instead, the save has to happen only when the app is already awake anyway. History is
flushed on a five-second throttle, but strictly during frames the loop is processing
regardless. On top of that, a guaranteed flush runs on menu close and shutdown
(`src/app/mod.rs`):

```rust
// Recording only marks history dirty; flush it on a throttle so a busy
// browsing burst collapses to one write per interval. This piggybacks
// on frames the loop is already awake for — it never schedules an idle
// wake (the blocking wait stays battery-efficient). A clean exit and
// menu close flush the remainder.
if self.last_history_flush.elapsed() >= HISTORY_FLUSH_INTERVAL {
    self.ui.flush_history();
    self.last_history_flush = Instant::now();
}
```

The trade-off is simple: a hard kill can lose up to five seconds of browsing history. For
history, that's perfectly acceptable.

In return, the wait loop itself never had to be touched. This is a good example of an
existing architecture being an optimization in its own right. If it's precisely the blocking
`wait_event` that lets the device last noticeably longer on a charge, then any new
optimization has to be built around it, not fight it.

## An optimization you can't use everywhere

`panic = "abort"` is an almost-free optimization for a release build. It shrinks the binary,
removes the stack-unwinding tables, reduces the memory footprint after mmap, and slightly
speeds up cold start. For the handheld version of retsurf it's exactly what you want.

But only for that one.

The project has another ARM build — a universal one, with WebGL enabled, meant to run
outside PortMaster. That's the one that can't use `panic = "abort"`.

The reason goes back to [[retsurf-servo-sdl2|an earlier post]]. To keep surfman working on
EGL 1.4, its probe is wrapped in `catch_unwind`, turning the library's internal panic into a
plain "WebGL not available." With `panic = "abort"` that becomes impossible: the stack no
longer unwinds, the panic isn't caught, and the process just terminates.

So `panic = "abort"` is enabled only in the handheld CI build, where WebGL is compiled out
entirely. The project's shared profile deliberately leaves the setting off (`Cargo.toml`):

```toml
# `panic = "abort"` is deliberately NOT here: it makes `catch_unwind` inert and
# would break the surfman EGL-1.4 probe (`platform/render.rs`) on webgl builds.
# The handheld CI build (webgl off) sets it via env var, where it's safe.
```

It's only safe on the one build where the probe is compiled away entirely — the webgl-off
handheld build — and there it's applied by a CI env var, not the shared profile. What *did*
ship to every build:

```toml
strip = true
debug-assertions = false
overflow-checks = false
```

The most useful of these is `strip`. CI strips symbols automatically only from the Linux
binary, but local builds and the Android libraries don't get that step. Without this setting
the `.so` shipped with its full symbol table, taking more memory and loading more slowly on
cold start.

This example is a good illustration that optimizations are rarely universal. `panic =
"abort"` really does shrink the binary — but only where you can afford it without losing
correctness.

## One binary won't run on every ARM

At the start of this post I lumped the A35, A53, and A55 into one category — weak in-order
cores. For a conversation about memory, that's fair enough.

For machine-code generation, it isn't.

The A35 and A53 implement ARMv8.0-A. The A55 is ARMv8.2-A: it adds LSE atomics, FP16, dot
product, and other instructions the older cores simply don't understand. Build Servo with
`-C target-cpu=cortex-a55` and LLVM will freely use those instructions throughout the binary
— including deep inside the multithreaded code.

That binary won't be slower on an A35. It won't run at all.

The first instruction the CPU doesn't know ends in a SIGILL — before control even reaches
`main()`. Here `target-cpu` is no longer a hint to the compiler but a choice of the minimum
ISA the program is built for.

From that, the only safe conclusion follows fairly quickly: one binary isn't enough.

CI builds the handheld version three times — once per processor family:

```yaml
matrix:
  include:
    # ARMv8.0-A, in-order. RK3326. Runs on A53 too (same ISA).
    - cpu: cortex-a35
    # ARMv8.0-A, in-order, crypto OFF. Safe v8.0 baseline + default fallback.
    - cpu: cortex-a53
    # ARMv8.2-A: LSE atomics, fp16, dotprod + crypto. SIGILLs on the v8.0
    # cores above — must stay a separate binary.
    - cpu: cortex-a55
```

The flag itself is one line, applied per matrix job — the rest of that build is the same
CI-only performance profile the last section described (fat LTO, one codegen unit,
`panic = "abort"` because webgl is off):

```yaml
RUSTFLAGS: "-C target-cpu=${{ matrix.cpu }}"
```

Three binaries solve the build. They create a new problem: the device now has to pick. And
it can't pick from *inside* the process — by the time `main` runs, an A35 handed the A55
binary has already crashed somewhere in the startup path. The choice has to happen one layer
up, in the launcher, before the wrong binary is ever launched.

PortMaster ports are shell-launched, so the dispatch lives in `Retsurf.sh`. It reads the ARM
"CPU part" id out of `/proc/cpuinfo` and execs the matching build (`portmaster/Retsurf.sh`):

```bash
CPU_PART="$(grep -m1 -i 'CPU part' /proc/cpuinfo | grep -oiE '0x[0-9a-f]+' | head -1 | tr 'A-Z' 'a-z')"
select_binary() {
  case "$CPU_PART" in
    0xd05) grep -qw atomics /proc/cpuinfo && echo "retsurf.a55" || echo "retsurf.a53" ;;
    0xd04) echo "retsurf.a35" ;;
    *)     echo "retsurf.a53" ;;   # A53 and any unrecognized CPU
  esac
}
```

There are two important details in that code.

The first is the default path. Any unrecognized processor gets the a53 build. That's the
most conservative target: ARMv8.0 with no extra extensions. An error in that direction only
costs some performance left unclaimed. An error toward the A55 means an instant SIGILL.

The second is the extra check before launching the A55 build. The CPU part alone isn't
enough: the launcher also requires the `atomics` flag in `/proc/cpuinfo`. Only then does it
treat the processor as genuinely supporting the ARMv8.2 instructions the separate build
exists for in the first place.

There's a fourth variant too — the universal ARM build outside PortMaster. It uses no
`target-cpu` at all, leaves WebGL enabled, and runs on any ARMv8.0+. It's the slowest
variant, but the only one you can distribute independently of a specific device.

## An optimization that rarely helps

Not every optimization I found actually changes anything on the handheld.

During the hunt I noticed that the color texture's sampling and wrap parameters were being
re-set on every FBO resize, even though `glTexImage2D` doesn't reset them — so re-setting
them was just repeating the same work.

Now they're set once, when the texture is created (`src/platform/render.rs`):

```rust
/// Set the color texture's sampling/wrap params once, at creation. They
/// persist across the `tex_image_2d` reallocations in [`Self::allocate`], so
/// there's no need to re-set them on every resize.
fn setup_texture_params(&self) {
```

On a desktop this really does save a few redundant GL calls every time the window is resized.

On the handheld, almost never.

The screen has a fixed resolution, there's no window to drag with a mouse, and the FBO is
usually allocated once at startup and never reallocated again. So the optimization exists,
but barely shows itself on the target platform.

I kept it anyway. It makes the code a little tidier, adds no complexity, and pays off in the
desktop and Android builds, where the window can be resized as many times as you like.

## Takeaways

1. On unified-memory systems, performance and memory are one resource. There's no separate
   VRAM to "hide" extra allocations in. Every megabyte the GPU holds is a megabyte JavaScript
   or the DOM can no longer use. Optimizing graphics and optimizing the app's memory turn out
   to be the same task.

2. The cheapest optimization is to remove the work entirely. Not shrink the depth buffer, but
   drop it. Not make the frame copy cheaper, but stop making it. Reducing overhead is almost
   always less valuable than making it disappear completely.

3. You optimize the whole system, not an isolated stretch of code. An idle timer would have
   cut the number of writes, but at the same time degraded the power-saving model built around
   the blocking wait.

4. Correctness sets the ceiling on performance. `panic = "abort"` really does shrink the
   binary, but it can't be used where `catch_unwind` is needed. Sometimes an attractive
   optimization turns out to be incompatible with the project's architecture.

5. One target doesn't always mean one platform. ARMv8 is a family, not a specific processor.
   For the A35, A53, and A55 the ISA difference is already significant enough that shipping
   several binaries is safer than trying to find a single "universal" one.

Most of the changes in this article are small on their own. Here a few megabytes of memory
disappeared, there a few GL calls or a stray allocation, and elsewhere the best decision was
to change nothing at all. But that's what optimization on a real project usually looks like:
not one big idea, but dozens of small decisions, each removing a little needless work. And
it's those, in the end, that add up to the difference between a program that merely runs and
one that's genuinely pleasant to use.
