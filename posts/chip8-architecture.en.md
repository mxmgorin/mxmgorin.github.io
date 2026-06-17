ch8go wasn't my first emulator. Before it I built [GMBoy](https://github.com/mxmgorin/gmboy), a cross-platform Game Boy emulator in Rust, and getting one core to run cleanly on both desktop and Android taught me how easily platform concerns leak into emulation code once you stop watching for them.

ch8go was also a chance to switch things up: I spend most of my time in Rust, and I wanted a real, self-contained project to get properly hands-on with Go. A CHIP-8 interpreter turned out to be the perfect size for it — small enough to finish, rich enough to actually learn the language.

So I gave myself one rule up front: the emulator core should never know whether it's running in a browser, a terminal, or a desktop window — or which framework happens to be driving it. That single constraint ended up shaping the entire project, so this post is a tour of how the code is organized and why each boundary exists.

## The Guest / Host / App split

Early on I settled on a three-layer model, borrowed loosely from how I think about emulation in general:

- **Guest** — the system being recreated (the CHIP-8 machine itself).
- **Host** — the real environment that actually runs the emulator.
- **App** — a thin layer that wires a guest and a host together.

Keeping these three ideas separate in my head made it much easier to decide where any given piece of code belonged.

## The core that knows nothing — `pkg/chip8` (Guest)

The heart of ch8go is `pkg/chip8`, and I worked hard to keep it boring. It's a pure, self-contained CHIP-8 virtual machine, responsible for exactly one thing: correct, deterministic emulation.

It has never heard of SDL, doesn't know what a file is, and can't render a pixel to a screen. By refusing any dependency on rendering, audio backends, OS APIs, or configuration, the core stays portable and easy to reason about. Concretely, it owns:

- instruction decoding and execution
- memory and registers
- the delay and sound timers
- the display representation
- sound output generation
- input state

That sounds restrictive, but it's the reason the same core runs unchanged behind every frontend. It also stays trivial to test, which matters a lot for something as quirk-laden as CHIP-8.

## The glue layer — `pkg/host`

`pkg/host` is where the reusable, platform-facing code lives. It depends on `pkg/chip8` and `pkg/db`, and acts as the bridge between the pure core and concrete frontends. It handles the things every frontend needs but the core shouldn't care about:

- VM configuration and lifecycle
- execution control: timing, stepping, pause/resume
- video and display helpers
- ROM loading and filesystem access

Centralizing this here is what keeps the actual applications thin. Without it, every frontend would re-implement the same timing and ROM-loading logic slightly differently — and slightly differently is exactly how bugs creep in.

## Data, not code — `pkg/db`

A surprising amount of "correct" CHIP-8 behavior is really just per-ROM configuration, so I pulled that out into `pkg/db`. It stores metadata — quirks, tick rate, color palette, variant, and platform definitions — and lets the rest of the system look it up by ROM hash or identifier.

It deliberately contains no emulation or application logic. Driving configuration from declarative data instead of hardcoded branches means I can support a new ROM or variant by adding data, not by editing the emulator.

## The frontends — `cmd/*`

Each subdirectory under `cmd/` is a standalone executable that wires the core, the host layer, and the metadata database into a real application. Their job is purely the platform-specific part:

- CLI flag parsing and argument handling
- loading ROM and platform metadata
- sound, video, and input
- orchestrating the execution loop

Today that's four frontends — a headless/terminal **CLI**, a native **SDL2** desktop app, a portable Go-based **Ebiten** build, and a **WASM** target for the browser — and every one of them reuses the exact same `pkg/host`, `pkg/chip8`, and `pkg/db`. Adding a fifth would mean writing only the glue, not another emulator — which is exactly the payoff GMBoy taught me to design for from the start.

## Related posts

- [[chip8-system|Getting to know CHIP-8]]
- [[chip8-testing|How I test it when there's no "correct"]]
