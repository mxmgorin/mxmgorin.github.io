Before I wrote a single opcode for ch8go, I spent time just getting to know CHIP-8 as a system. This post is the mental model I built — what CHIP-8 actually is, the variants that make it messier than it looks, and the quirks that trip up every emulator author at least once.

## What CHIP-8 actually is

CHIP-8 gets called a "language" a lot, and that confused me at first. It's better thought of as a tiny **virtual platform**: an interpreted virtual machine from the 1970s, designed to run small programs on very constrained hardware.

The whole system fits in your head. There's a CPU, a few kilobytes of memory, two timers, a monochrome display, a hex keypad, and a single beep. That minimalism is exactly what makes it such a good first emulator to build.

## The pieces I had to model

Everything in CHIP-8 maps to one of a handful of components:

- **CPU** — 16 general-purpose 8-bit registers (V0–VF), one 16-bit index register (I), a program counter and a stack, and a fixed instruction width.
- **Memory** — a 4 KB address space in classic CHIP-8, with programs loaded at 0x200 and font data in a reserved region.
- **Timers** — a delay timer and a sound timer, both counting down at 60 Hz.
- **Display** — a monochrome bitmap drawn with an XOR model. Resolution depends on the variant: 64×32 for CHIP-8, 128×64 for SUPER-CHIP.
- **Input** — a 16-key hexadecimal keypad that programs poll directly.
- **Sound** — a single tone that plays while the sound timer is non-zero. What that actually sounds like is left to the host.

None of these is complicated on its own. The interesting part is how much disagreement there is about how they should behave.

## Why there isn't one "CHIP-8"

This is the thing that surprised me most: CHIP-8 has no single authoritative spec. Over the decades, different interpreters and extensions drifted apart, leaving a family of related-but-incompatible variants. "Correct" behavior depends entirely on which variant you're targeting, and some instructions are genuinely ambiguous without that context.

The ones I cared about most:

- **CHIP-8** — the original instruction set and execution model.
- **SUPER-CHIP 1.0 (SCHIP10)** — adds a higher-resolution mode, extra instructions, and scrolling/display control.
- **XO-CHIP** — goes further with more memory, extended audio and graphics, and stronger backward-compatibility expectations.

And those are just the headline names. There's also CHIP-48, SUPER-CHIP 1.1, the legacy COSMAC VIP behavior, MEGA-CHIP8, and more — each differing in instruction semantics, timing, memory behavior, or display handling. If you want to go down the rabbit hole, there's a [great catalog of extensions](https://chip-8.github.io/extensions/).

## The quirks that actually bite

The differences between variants are usually called *quirks*, and they're where most emulator bugs hide. These are the ones I had to handle deliberately:

- **Shift instructions (8xy6, 8xyE)** — on most systems these read `vY` and store the shifted result in `vX`. The HP48 interpreters used `vX` as both input and output, creating the shift quirk.
- **Flags reset on OR/AND/XOR** — the original COSMAC VIP reset `vF` after each math-coprocessor opcode. Later interpreters didn't copy that, so it's optional behavior.
- **Sprite wrapping vs. clipping** — most systems clip sprites at the screen edge. Octo (which spawned XO-CHIP) wraps them to the other side instead — the wrap quirk.
- **Index register on load/store** — storing or loading registers normally bumps `i` by `X + 1`. The CHIP-48 interpreter only added `X`, and SUPER-CHIP 1.1 didn't touch `i` at all — two more quirks to flag.
- **Jump with offset** — `jump to <address> + v0` was misimplemented on every HP48 interpreter as `<address> + vX`, giving the jump quirk.
- **Vertical-blank wait on draw** — the COSMAC VIP waited for vblank before each draw to avoid tearing, which also capped execution speed. Some games rely on that limit to be playable, so it has to be modeled rather than ignored.

Knowing these existed *before* writing the interpreter saved me a lot of "why does this one game look wrong" debugging later. With this picture in place, the next step was deciding how to actually structure the emulator.

## Related posts

- [[chip8-architecture|How I structured the emulator]]
- [[chip8-testing|How I test it when there's no "correct"]]
