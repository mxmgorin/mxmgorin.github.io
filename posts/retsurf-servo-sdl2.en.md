At its core, [retsurf](https://github.com/mxmgorin/retsurf) is three big pieces:
**Servo** renders the web, **SDL2** owns the window and input on bare
hardware, and **egui** draws the browser's own UI on top. None of those is the
hard part. The hard part is getting all three to share *one GPU* on a device with
no compositor and an old graphics driver.

This is the full breakdown: how Servo and SDL2 actually connect, and every way it broke on the way to run on a retro-handheld. In order, because the order
is the story — each crash is what pushed the architecture to the next iteration.

## First attempt — surfman from SDL2's window handle

The obvious thing to try first is the path Servo gives you. Servo doesn't
ask you for pixels; it asks you for a `RenderingContext`, and its surface library
[surfman](https://github.com/servo/surfman) will happily build its *own* GL context
from the window's raw handle — it wants to be in charge of the GPU connection. The
`sdl2` crate can hand out that raw handle via `raw-window-handle`, so you wire the
two together and let Servo own the GPU connection end to end.

On my Linux desktop that worked immediately — `sdl2` returns an X11 (or Wayland)
handle, surfman builds its context from it, and pages rendered. It looked solved.

Then I ran the same binary on the handheld and it crashed. These
devices (Knulli, muOS, ROCKNIX) run on bare KMS/DRM with no X11 or Wayland
compositor, and the `sdl2` Rust crate, as of 0.38, exposes a raw-window-handle for
Wayland, X11, Win32 — but **not for DRM/GBM**. So surfman had nothing to build a
context *from*: the call that returned a handle on my desktop returned nothing on
the device. The default path simply isn't available.

That decides the whole design:

> **SDL2 must own the one and only GL context** — it already knows how to create
> one on bare KMS/DRM via EGL/GBM, the same way every other SDL2 handheld port
> does — and **Servo renders *into* it.**

Here's SDL2 taking ownership, in `src/platform/window.rs`. Note it asks for a
**GLES** context (the Mali blobs on these SoCs only speak GLES; WebRender needs
≥ 3.0):

```rust
let gl_attr = video_subsystem.gl_attr();
if config.use_gles {
    // Mali blobs on RK3326/RK3566 expose GLES 3.2; WebRender needs >= 3.0.
    gl_attr.set_context_profile(GLProfile::GLES);
    gl_attr.set_context_version(3, 0);
}
gl_attr.set_double_buffer(true);

let window = video_subsystem.window("retsurf", w, h).opengl().resizable().build()?;
let gl_context = window.gl_create_context()?;
window.gl_make_current(&gl_context)?;
```

Then SDL's proc loader feeds *both* GL stacks — `glow` for egui, `gleam` for
Servo/WebRender — off the same context:

```rust
let glow_ctx = Arc::new(unsafe {
    glow::Context::from_loader_function(|name| {
        video_subsystem.gl_get_proc_address(name) as *const _
    })
});
let gl: Rc<dyn Gl> = unsafe {
    gleam::gl::GlesFns::load_with(|name| {
        video_subsystem.gl_get_proc_address(name) as *const _
    })
};
```

Two GL bindings, one context. Hold that thought — it's the source of half the
crashes below.

## Second attempt — software rendering

With the default GPU path dead on the device, I wanted to prove the rest of the
pipeline end to end before fighting the GPU again. So I used Servo's
`SoftwareRenderingContext` (an offscreen llvmpipe rasterizer). Each frame:
Servo rasterizes the page on the CPU, retsurf calls `read_to_image()` to pull the
pixels out, uploads them as an egui texture, and egui composites that texture with
the toolbar.

It worked. Pages appeared. But it's wrong for shipping in two ways: it needs
llvmpipe present on the device (a CPU rasterizer is exactly what you *don't* want
on a weak ARM chip), and it does a full frame readback + re-upload every single
frame. It was a stepping stone, not a destination.

And critically: there were **two GL contexts alive in one thread** — SDL's, and
the one surfman spun up for the software renderer. That is where the crashes
started.

## Crash #1 — the eglBindAPI clash (startup panic)

SDL had created a **GLES** context. surfman's software context was **desktop
GL**. EGL tracks a per-thread "current client API," and having one stack bind ES
while the other bound desktop GL blew up at startup.

The fix is an environment variable, set before any GL initialization, that tells
surfman to also be GLES so the two stacks agree (`src/lib.rs`):

```rust
if app_config.display.use_gles {
    // SDL creates a GLES context (sets the thread's EGL API to ES). Servo's
    // surfman context must use the same API or context creation fails, so
    // force surfman to GLES too. Must be set before any surfman/SDL GL init.
    std::env::set_var("SURFMAN_FORCE_GLES", "1");
}
```

One stack disagreeing with the other about *which GL* is in play turned out to be
a recurring theme — see crash #4.

## Crash #2 — the make-current cache and the undefined framebuffer

This is one of the nastiest bugs: *thousands* of errors and a black window with
no visible cause.

SDL caches which GL context it thinks is current, so it can skip a redundant
`eglMakeCurrent`. Reasonable — except surfman, doing its own rendering, called
`eglMakeCurrent` directly and changed the thread's current context **behind SDL's
back**. SDL's cache was now invalid. So when egui went to draw and asked SDL to
make the window context current, SDL looked at its cache, decided "already
current," and *skipped the real `eglMakeCurrent`*.

egui then drew into whatever was actually bound — surfman's context, not the
window — and the GPU reported `GL_FRAMEBUFFER_UNDEFINED` followed by a flood of
`GL_INVALID_FRAMEBUFFER_OPERATION`. And on every frame.

The fix is to invalidate SDL's cache before rebinding, so SDL is forced to issue a
real `eglMakeCurrent`:

```
SDL_GL_MakeCurrent(window, NULL)   // clear SDL's "current context" cache
window.gl_make_current(&gl_context) // this actually calls eglMakeCurrent
```

The lesson here: **when two libraries both mutate the same hidden global state,
any cache one of them keeps about that state is a landmine.** SDL cached the EGL
current-context; surfman wrote it without telling SDL.

## Crash #3 — the teardown panic

With rendering working, quitting crashed. Servo's `SoftwareRenderingContext`
doesn't destroy its surfman context on drop, and surfman has a guard that *panics*
if a context is dropped without being explicitly destroyed:
`Contexts must be destroyed explicitly`. So a clean exit unwound into a panic.

The fix, still in the code today (`src/app/mod.rs`), is to not run that
destructor at all — shut Servo down cleanly for the things that matter (cookies,
localStorage), then hand the rest to the OS:

```rust
self.browser.shutdown();   // flushes cookies / localStorage to disk

// Servo's rendering context doesn't destroy its surfman context on drop, which
// trips surfman's "destroy explicitly" guard and panics during unwinding. Exit
// before running destructors; the OS reclaims everything.
std::process::exit(0);
```

Inelegant, but correct: the process is ending, the kernel reclaims the GPU
resources, and skipping the destructor costs nothing.

## Crash #4 — SDL and surfman on different display servers

This one only bites on a Wayland *desktop*, but it's instructive because it's the
same disease as crash #1: two stacks disagreeing about the environment.

surfman picks its display backend from environment variables — if `WAYLAND_DISPLAY`
is set, it goes Wayland. SDL makes its *own* independent choice, and on a lot of
Wayland desktops SDL still defaults to **x11** (via XWayland). So surfman lands on
Wayland, SDL lands on x11, their GL contexts can't coexist, and surfman's context
creation fails → startup panic.

The fix forces SDL to agree with surfman when both are on a Wayland desktop, and
stays out of the way everywhere else (`src/lib.rs`):

```rust
// surfman picks Wayland when WAYLAND_DISPLAY is set; SDL often defaults to x11.
// Align them. On the handheld (no WAYLAND_DISPLAY) this is skipped → SDL uses
// kmsdrm as intended. An explicit SDL_VIDEODRIVER always wins.
if std::env::var_os("SDL_VIDEODRIVER").is_none()
    && std::env::var_os("WAYLAND_DISPLAY").is_some()
{
    std::env::set_var("SDL_VIDEODRIVER", "wayland");
}
```

## The rethink — stop having two contexts

Three of those four crashes (#1, #2, #3) share one root cause: **there were two GL
contexts in the thread, fighting over global EGL state.** My original plan was to
make surfman use SDL's context so they'd be the same one. But the cleaner move
turned out to be the opposite — get surfman out of the rendering path entirely.

The key realization: `servo::RenderingContext` is a *trait*. I don't have to use
surfman's implementation; I can write my own over SDL's single context. And
WebRender renders into **whatever framebuffer is bound** after it calls
`prepare_for_rendering()`. So I just bind my own framebuffer object (FBO) there,
let Servo draw into it, and hand egui the FBO's color texture to composite.

That's `SdlRenderingContext` in `src/platform/render.rs`. The whole trait
implementation is almost suspiciously small:

```rust
impl RenderingContext for SdlRenderingContext {
    fn prepare_for_rendering(&self) {
        // WebRender renders into whatever FBO is bound here — so bind ours.
        self.gl.bind_framebuffer(gl::FRAMEBUFFER, self.fbo.get());
    }

    fn present(&self) {
        // No swap: egui composites the color texture into the window framebuffer.
    }

    fn make_current(&self) -> Result<(), surfman::Error> {
        // Single shared SDL2 GL context; already current on this thread.
        Ok(())
    }

    fn connection(&self) -> Option<surfman::Connection> {
        self.connection.clone()
    }
    // ...gleam/glow accessors, resize, read_to_image
}
```

Look at what those functions *don't* do. `make_current` is a no-op returning
`Ok(())` — there's only one context and it's already current, so there is nothing
to switch to and nothing to fight over. `present` is empty — egui owns the actual
buffer swap. With a single context, crashes #1, #2, and #3 simply can't happen
anymore. (They're now precautionary: #1's `SURFMAN_FORCE_GLES` and #4's driver
alignment still apply only because `connection()` *still* calls into surfman —
which is the setup for the final crash.)

## How Servo and egui actually connect, per frame

With the new approach, the main loop becomes:

```rust
// Render Servo into its FBO; egui composites that FBO's texture.
self.browser.paint();   // Servo/WebRender → our FBO (bound in prepare_for_rendering)
self.ui.update(...);    // egui builds the toolbar/overlays
// ...
self.draw();            // egui binds framebuffer 0, draws the FBO color texture, swaps
```

One context, one FBO, one texture handoff, one swap. That's the entire Servo↔SDL2
bridge, and it's the thing that finally runs on bare handheld hardware.

## Crash #5 — it worked on desktop, then panicked on the actual device

Everything above was verified on desktop at GLES 3.2: zero GL errors, pages
right-side-up. I built for aarch64, copied it to a Mali handheld, and it panicked
at startup:

```
surfman .../egl_bindings.rs: egl function was not loaded
```

The culprit is that `connection()` call. surfman 0.12 builds its connection using
`eglGetPlatformDisplay` — an **EGL 1.5** symbol — loaded via `dlsym` on every Linux
backend. My desktop's Mesa is EGL 1.5; the device's Mali blob is **EGL 1.4** and
simply doesn't have that symbol. surfman then *panics* rather than returning an
error, and Servo's painter registration `.expect()`s the connection — two layers
both choosing "crash" over "cope."

The connection is only used for WebGL/WebGPU external images, which a handheld can
happily live without, so the fix is to let it be absent. retsurf's `connection()`
probes surfman behind a `catch_unwind` (you can't `match` a panic) and returns
`None` on failure; a small vendored Servo patch makes the registration treat a
missing connection as "WebGL off" instead of panicking. On the actual shipping
build, the whole WebGL path is behind a `webgl` Cargo feature that's compiled out.
That one bug taught me the most, and the lesson is the whole reason it cost a
weekend: *your desktop drivers are not the target, and a library that panics on a
missing optional capability robs you of graceful degradation.*

## Honorable mentions (the small ones)

Not every problem was a full crash. A few that ate an afternoon each:

- **You can't debug what you can't see.** The handheld launcher discards stderr, so
  a panic leaves nothing but exit code 101. retsurf installs a panic hook that
  mirrors the message *and backtrace* to a file, and can tee logs to a file too
  (`RETSURF_PANIC_FILE` / `RETSURF_LOG_FILE`). The first on-device bug I could only
  diagnose *because* of this — otherwise crash #5 would've been an invisible
  instant-exit.
- **egui overlays are invisible on their first frame.** A freshly created egui
  `Area` gets laid out invisibly on its first pass (it's measuring itself), so an
  overlay opened in response to input wouldn't appear until the *next* repaint —
  and the loop blocks on input, so there often wasn't one. The fix is to
  `request_repaint()` after spawning an overlay, forcing the second frame that
  actually draws it.
- **A black strip on the very first frame**, because the viewport size only
  settles after one resize. Cosmetic, and still an open item on the cleanup list
  rather than a solved one.

## What this all taught me

Four things, roughly in order of how much they hurt:

1. **The platform makes your big architectural decisions for you.** "SDL2 owns the
   context, Servo renders into an FBO" wasn't a preference — it fell out of the
   sdl2 crate having no DRM/GBM window handle. The constraint *was* the design.

2. **Two libraries sharing hidden global state is a crash factory.** Three of five
   crashes were SDL and surfman fighting over the thread's current EGL context or
   display backend. The fix that actually held wasn't reconciling them — it was
   *removing one of them* from the hot path. The simplest architecture (one
   context, render into an FBO) only became obvious after the two-context version
   taught me, painfully, why two contexts are a trap.

3. **Desktop is a generous liar.** Mesa is current and forgiving; the device driver
   is a frozen, minimal EGL 1.4 stub. Every crash that *mattered for shipping* —
   #5 — was invisible on the desktop and instant on the device. The only real test
   was the hardware.

4. **Panicking on a recoverable condition is the expensive kind of bug.** A missing
   EGL 1.5 symbol on a 2021 GPU isn't exceptional, but because surfman panicked
   instead of returning `Err`, it became an unrecoverable crash three layers up. Be
   the library that returns `Option`.

The reward is anticlimactic, which is usually a sign that the work is finished. The device boots, a real JavaScript-heavy page renders on the Mali GPU through a single shared GLES context, and nothing interesting happens: no readbacks, no GL errors, no panics.

Just a browser running on a device that was originally built to emulate Game Boy ROMs.
