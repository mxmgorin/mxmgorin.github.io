There's a moment that every retro-handheld owner hits eventually. You're deep in
some obscure SNES RPG on a $60 plastic slab running a Linux, you get stuck on a boss, and you reach for the thing you'd reach for on
any other computer made in the last twenty-five years: a web browser. To pull up
a wiki. A FAQ. A map.

And there isn't a working one.

Sure, a couple of stripped-down browsers will technically launch — but none of
them can render the modern, JavaScript-heavy web. The device has Wi-Fi, a
quad-core ARM chip, a GPU, and a gigabyte of RAM — more than enough to have
browsed the web comfortably in 2010 — and yet a browser that actually works, the
single most universal piece of software on Earth, is missing. That gap is the
whole reason **[retsurf](https://github.com/mxmgorin/retsurf)** exists.

I came at this from a particular angle. I'd spent a while as a
[PortMaster](https://portmaster.games/profile.html?porter=Troidem) contributor,
porting games to these ARM-Linux handhelds — and somewhere in the middle of that I
stopped seeing them as toys and started seeing them as small Linux computers that
were just missing software. Once that clicked, the missing browser became the
thing I most wanted to build.

## The gap

Randheld Linux distros — [Knulli](https://knulli.org),
[muOS](https://muos.dev), [ROCKNIX](https://rocknix.org) — are extraordinary
pieces of work. They turn cheap hardware into focused little game machines. But
they are *game* machines. The design assumption, top to bottom, is "boot straight
into a game launcher, render through the GPU, drive everything with a D-pad and
some buttons." There's no desktop. Usually no window manager. Often not even an
X11 or Wayland server running — the UI talks to the display directly through
KMS/DRM.

So when you go looking for a browser, you find that all three obvious options are:

1. **The lightweight browsers don't render the modern web.** Something like
   NetSurf will *launch*, but the web it was built for is gone. Today's
   sites are JavaScript applications. A search results page, a wiki, a forum — all
   of it assumes a real engine. Drop JS and you don't get a lighter browser, you get a mostly-broken one.

2. **The desktop browsers assume a desktop.** Firefox and Chromium expect a
   compositor to hand them a window, and a mouse and keyboard to drive it. Take
   away X11/Wayland and you've taken away the thing they render *into*. Take away
   the pointer and the entire interaction model collapses.

4. **There's no input model for a browser on a gamepad.** Even if you solved
   rendering, how do you click a link with a thumbstick? Type a URL with no
   keyboard? Scroll a page with buttons? "Browser" and "gamepad" have never really
   met.

Each of these is a hard problem. Stacked together they're the reason the gap has
stayed open. retsurf is an attempt to close all three at once.

## You don't write a browser engine

Let me kill the most flattering misconception up front: I did not write a browser
engine. Nobody should. A browser engine is one of the largest, most
security-critical, most standards-burdened bodies of software humans build, and
there are about three of them on the planet.

What changed in the last few years is that one became something
you can *embed*. [Servo](https://github.com/servo/servo) — the Rust engine that
started at Mozilla and is now an independent project — exposes its rendering
pipeline as a library. You hand it a GL context and a URL; it hands you back
pixels. That's the unlock. retsurf is, at its core, the glue around three crates:

- **[Servo](https://servo.org)** for the actual web rendering (it uses WebRender,
  a GPU-first renderer, underneath).
- **[SDL2](https://www.libsdl.org/)** for the window, the GL context, and input —
  because SDL2 already knows how to talk to bare KMS/DRM and to gamepads, which is
  exactly what these devices expose.
- **[egui](https://github.com/emilk/egui)** for retsurf's own UI — the toolbar, the
  menus, the on-screen keyboard — composited on top of the page.

The whole bet is that the hard part — the engine — is solved, and the
*interesting* part is everything in the seam between a modern engine and a device
that was designed to run Game Boy ROMs.

That seam turned out to be deep — and it's where the real work was.

## What made it hard

None of these were exotic on their own; they just all landed at once. WebRender
needs OpenGL ES 3.0, and the usual `gl4es` shim tops out at GL 2.x — so Servo has
to talk to the device's native GLES driver directly. Running SDL2's GL context
alongside Servo's own was a trap, so everything renders into a single shared
context with zero CPU copies. The Mali driver reports EGL 1.4 where a dependency
assumed 1.5 and *panicked* instead of degrading — code that ran fine on my desktop
and hard-crashed the instant it touched hardware. And the whole thing is driven by
a gamepad — virtual cursor, link hints, on-screen keyboard — while staying small
and fast on a few hundred megabytes of free RAM. What makes it fun is that it all
hits at once, on hardware you can't `gdb` comfortably, where "it works on my
machine" is a lie you tell yourself right up until the device boots.

## What it is now

retsurf runs on handhelds like the TrimUI Smart Pro, the Powkiddy RGB30, and the
Anbernic RG35XX SP. It renders the real, JavaScript-heavy web through Servo. It has gamepad
navigation with a cursor and link hints, an on-screen keyboard with multiple
layouts, real page zoom that reflows the layout (not a magnifier), a reader mode,
background downloads, and network-level ad blocking. It has a native start page
with a speed-dial grid. And — almost by accident, because the rendering path was
designed cleanly — the same code builds an Android APK.

It's experimental. It has rough edges. But it answers the boss-fight question:
you can now pull up the wiki on the thing in your hands.
