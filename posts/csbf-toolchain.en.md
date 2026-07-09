After a Game Boy emulator in Rust ([oxGBC](https://github.com/mxmgorin/oxgbc)) and a CHIP-8 interpreter in Go ([ch8go](https://github.com/mxmgorin/ch8go)), I got curious about the other side of the process. Both of those projects run bytecode that already exists, and the natural next step was to write a program that produces that bytecode itself. On top of that, I wanted to pick the simplest possible language, so the focus would fall on the compiler rather than on the parser and the syntax.

Brainfuck is almost perfect for that. The whole language is eight instructions — `+ - < > . , [ ]` — a byte tape, and a pointer. No variables, no types, no functions, no grammar to speak of. Because of that, almost all of the complexity shifts to where a compiler's real work begins: the intermediate representation (IR), the optimizations, the virtual machine, the debugger, and code generation.

I chose C# and .NET for the implementation. I'd worked with the platform before, but in recent years I've mostly written Rust, and this project was a good chance to come back to C#, vary the stack a little, and keep the language fresh.

[csbf](https://github.com/mxmgorin/csbf) is built around exactly those components — my Brainfuck compiler in C#/.NET. And since the whole thing compiles to WebAssembly, it runs entirely in your browser: [try it](https://mxmgorin.github.io/csbf/).

## How the pieces fit together

Almost every assembly in csbf leans on one shared thing: the IR. The parser turns source into a flat `Op[]`, and nothing downstream ever touches text again — it all speaks that one op list:

```
source → parser → IR (Op[]) → optimizer → { interpreter · Go transpiler · JIT }
```

`Csbf.Core` is the hub — parser, optimizer, the IR itself, and the interpreter (the VM). Everything else plugs into the IR as a swappable part: code generators (`Csbf.Codegen`) implement one `ICodegen` interface, so a new backend — C, WebAssembly text — is just another implementation; the debugger (`Csbf.Debugger`) and the JIT (`Csbf.Jit`) live in their own assemblies; and two frontends sit on top — a CLI (`Csbf.Cli`) and the Blazor/WASM playground (`Csbf.Web`). Tellingly, `Csbf.Web` references everything *except* `Csbf.Jit`: there's nowhere in the browser to run a JIT, so it simply isn't there. The IR is the contract — define an op once and the optimizer, the interpreter, and every code generator understand it for free.

## When syntax isn't the point

For a modern language, most of the difficulty really is in the parser — but Brainfuck is interesting precisely because it takes that step almost entirely out of the equation.

The language's whole syntax is eight characters. So the parser is just an ordinary pass over the source: each character becomes a typed instruction, and every `[`/`]` pair is resolved to a jump target right away. After that, the rest of the compiler never works with text again and never scans for a matching closing bracket — it operates on a single representation of the program.

That's the point where the interesting stages begin: the intermediate representation (IR), the optimizations, the virtual machine, the debugger, and code generation.

In `src/Csbf.Core/Op.cs` it looks like this:

```csharp
public readonly record struct Op(OpKind Kind, int Arg);

public enum OpKind
{
    AddPtr,   // > <   move the data pointer by Arg
    AddByte,  // + -   add Arg to the current cell
    Out, In,  // . ,   I/O
    Jz, Jnz,  // [ ]   conditional jumps (targets resolved at parse time)
    SetByte,  //       set the current cell (a lowered clear loop)
    ScanPtr,  //       scan by a stride until a zero cell
}
```

The virtual machine, the optimizer, and any code generator all receive this flat list of operations. Add an op here and it shows up everywhere.

## When every step is reversible

The virtual machine turned out to be a small thing: an instruction pointer, a data pointer, and a bounds-checked 30,000-byte tape. It can step through a program one op at a time, show the state of the registers and memory, and stop at breakpoints. All fairly ordinary.

The interesting part is elsewhere. Thanks to Brainfuck's minimalism, each instruction changes only a small part of the machine's state: `Ip`, `Dp`, and, in the worst case, one memory cell. That means any executed step can be undone without re-running the program or storing full state snapshots — it's enough to save a small delta of the changes. Here's what recording a single step looks like, in `src/Csbf.Core/Vm.cs`:

```csharp
// The VM mutates only Ip, Dp, and at most one cell per op, so every step is
// exactly reversible.
private readonly record struct StepDelta(int Ip, int Dp, int CellIndex, byte CellValue);
```

`StepBack()` pops the last delta and restores the fields it changed. Run `N` steps forward and then `N` steps back, and the machine ends up in exactly the same state — same registers, same memory — while keeping nothing more than a ring buffer of these small structs. In the CLI it's the `back [n]` command; in the browser it's the ⏮ button. Reversible debugging comes almost for free here — a direct consequence of how minimal the instruction set is.

## Teaching the optimizer to read idioms

A naïve Brainfuck interpreter spends most of its time in loops that do fairly trivial things. Two patterns come up so often that it makes sense to treat them as instructions in their own right:

- `[-]` and `[+]` count the current cell down (or up) until it reaches zero. That's really just **clearing the cell**.
- `[>]` and `[<]` move the pointer until it lands on a zero cell. That's the equivalent of a linear memory scan (`memchr`).

The `csbf` optimizer recognizes both patterns and replaces the whole loop with a single specialized instruction. The relevant code, from `src/Csbf.Core/Optimizer.cs`:

```csharp
// [-] / [+]: only a ±1 step is a guaranteed clear — e.g. [--] loops
// forever on odd start values, so we deliberately don't lower it.
case OpKind.AddByte when lowerClear && (body.Arg == 1 || body.Arg == -1):
    lowered = new Op(OpKind.SetByte, 0);
    return true;

// [>] / [<] (and collapsed strides like [>>]): scan by a fixed stride.
case OpKind.AddPtr when lowerScan && body.Arg != 0:
    lowered = new Op(OpKind.ScanPtr, body.Arg);
    return true;
```

`[--]` is especially interesting — at first glance it looks like just another way to clear a cell. But that only holds for even starting values. If the value is odd, the loop steps straight past zero, wraps around to `255` after the overflow, and never terminates. That's exactly why the optimizer only lowers loops with a `±1` step.

The recognition itself is literally a few lines. The real difficulty is making sure the transformation preserves the program's semantics in every possible case.

Each pass can be toggled independently. That's handy not just for measuring performance but for understanding what's going on: turn the `clear` pass off and the `[-]` loop reappears in the disassembly as three separate instructions; turn it back on and it collapses into a single `SET 0` again.

### How it affects performance

A good test of the optimizer is the classic Brainfuck mandelbrot, which executes a few billion instructions. Run it first with no optimizations and then with all the passes on, and you get:

- **none:** 299.72 s
- **all:** 60.30 s — a **4.97× speedup**

After optimization the instruction count drops from 11,451 to 3,619, because the `SET` and `SCAN` operations replace whole loops with a single instruction. Most of the gain comes precisely from the virtual machine having far fewer operations to execute. The built-in `bench` command produces this table for any program.

## The same IR compiles to Go

After optimization the intermediate representation is a flat list of instructions. That turns the code generator into an almost mechanical mapping of "one operation, one `case`". `src/Csbf.Codegen/GoCodegen.cs` produces an ordinary Go program, and since the optimizer has already done its work, the result reads more like something a person would write than something transliterated from a tape machine:

```go
// +[-] compiles to:
func main() {
    mem := make([]byte, 30000)
    dp := 0
    mem[dp] += 1
    mem[dp] = 0        // the [-] clear, lowered — not a for-loop
}
```

Turn the optimizations off and the same source turns back into a plain `for mem[dp] != 0 { ... }` loop. The backend stays the same — only the IR changes.

## The same IR, straight to machine code

The Go backend compiles the IR into another language. The last backend compiles it straight into execution.

The JIT compiler generates CLR IL inside a `DynamicMethod` (`System.Reflection.Emit`) and hands it to the runtime's own JIT, which turns the IL into machine code. No LLVM, no external compiler, no extra toolchain required. The tape is passed as the method's first argument, the data pointer lives in a local variable, and each operation is translated into a small set of IL instructions that mirror the interpreter's logic.

Loops are especially convenient to implement. During parsing, `[`/`]` pairs are already resolved to instruction indices, so the JIT doesn't search for matching brackets or use a jump stack. For each operation it creates an IL label, and branches point straight at the target:

```csharp
// One IL label per op index. Jump targets are already op indices (resolved at
// parse time), so a branch points straight at its target — no bracket matching,
// no runtime jump stack.
var labels = new Label[ops.Count + 1];
...
case OpKind.Jz:
    il.Emit(OpCodes.Ldelem_U1);
    il.Emit(OpCodes.Brfalse, labels[op.Arg]);
```

Memory bounds checks cost almost nothing, too. The tape is a plain `byte[]`, so a pointer moving past the end of the array is caught automatically by the CLR, and the exception is then converted into the same `BrainfuckRuntimeException` the interpreter uses.

This is where the top performance is reached. Where the fully-optimized interpreter runs the classic Brainfuck mandelbrot in almost a minute and a half, the JIT version finishes it in about **7.5 seconds** — nearly **11.6× faster**. And that speedup comes on top of the ~5× already gained from the optimizations, because the JIT works with the same optimized IR.

There's just one limitation: this part of the project doesn't work in the browser. The WebAssembly environment has no JIT at execution time, so there's simply nothing to compile the generated IL. For that reason `Jit.IsSupported` relies on `RuntimeFeature.IsDynamicCodeSupported`, and when dynamic code isn't available it automatically falls back to the interpreter. A full JIT stays a desktop-environment feature.

## Running the whole thing in the browser

The best part is that none of this needs a server. `Csbf.Core`, `Csbf.Debugger`, and `Csbf.Codegen` compile to WebAssembly, and the Blazor frontend uses them through `IVmIo`. It's the same code that runs in the CLI, only now it executes right in the browser.

As it runs, you can watch the virtual machine's internal state: the tape with the pointer's current position, the registers, a disassembly of the optimized IR, breakpoints, single-stepping, reverse debugging, toggling the optimizer passes, a built-in benchmark, and Go code generation.

Brainfuck was conceived as a joke language, but its minimalism makes it a great playground for learning about compilers. When the parser collapses to essentially a single pass over the source, what comes to the fore is the intermediate representation (IR), the optimizations, the virtual machine, code generation, and the JIT. Eight instructions, it turns out, are more than enough to build a real compiler around.
