Testing an emulator sounds straightforward — run a program, check the output — until you hit the central problem with CHIP-8: there often isn't a single correct output. The platform exists in many variants (CHIP-8, SCHIP, XO-CHIP, and others), each with its own historical quirks, and even "plain" CHIP-8 has instructions with several legitimate interpretations.

So I couldn't test ch8go against "one true behavior." Instead, the testing system has two goals:

- catch regressions within a given variant or configuration, and
- make the differences *between* variants explicit, reproducible, and intentional.

That second goal is the one that makes emulator changes feel safe despite all the ambiguity.

## Driving real test ROMs automatically

Most of the testing is built on well-known CHIP-8 test ROMs. The catch is that many of them are interactive — they expose different code paths through built-in menus, depending on which variant or quirk you want to exercise.

To handle that, the harness configures the emulator for a specific variant and then injects scripted input events to navigate those menus at runtime. One ROM can validate several cases that way, and because the harness drives the selections deterministically, every run exercises the same path without any manual clicking.

## Why golden files

For checking the actual output, I went with golden-file comparison. So much CHIP-8 behavior is *visual* that comparing rendered frames turned out to be the most honest way to catch subtle cross-variant differences. It lets the suite:

- catch regressions early,
- confirm that variant-specific quirks behave as intended, and
- guarantee that a change doesn't silently alter established behavior.

The test ROMs themselves come from the **Timendus** and **Octo** suites plus a few custom ones, and live under `testdata/roms/`. The golden references are PNG framebuffer snapshots under `testdata/golden/`.

### Generating goldens (deliberately manual)

Golden files are produced by running the tests with an explicit output flag, which writes the framebuffer out to `testdata/golden/`. I keep this step manual on purpose — goldens are only ever regenerated when:

- behavior changed intentionally,
- a bug was fixed, or
- the output format changed.

If regeneration were automatic, a regression would just quietly overwrite the reference it was supposed to fail against.

### Comparing during a run

During a normal test run the flow is simple: render a frame, compare it byte-for-byte against the golden file, and fail on any mismatch. That byte-exact check is what keeps visual regressions from slipping through.

## Catching it in CI

Finally, all of this runs in CI so regressions surface on every change rather than whenever I happen to notice them. The pipeline sets up the Go toolchain, runs the unit and integration tests, and validates the golden files.

It's a fairly small setup, but combined with the variant-aware harness it turns "I think this still works" into something I can actually trust.

## Related posts

- [[chip8-system|Getting to know CHIP-8]]
- [[chip8-architecture|How I structured the emulator]]
