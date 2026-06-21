Every other post in this series has been about getting pixels onto the screen —
wiring Servo into SDL2, fighting two GL contexts and old driver.
By the end of [[retsurf-servo-sdl2|the SDL2 wiring post]] the device boots and
renders the real web. And then you sit there holding it, wondering how to control it.

Because a web browser assumes two input devices that this thing does not have: a
mouse and a keyboard. Links are clicked with a mouse. URLs are typed on a
keyboard. Hover, focus, text selection, scrolling — all of it is built on a cursor
you aim and a hundred keys you press. A retro handheld has a D-pad, a few of
face buttons, and *maybe* one or two analog
sticks. That's it. Some of them don't even have the sticks.

So the question this post answers is: how do you control a browser — click a link,
type a search, switch a tab, scroll a page — with the controls of a Game Boy? The
answer is the same move, made over and over, until the whole UI is rebuilt from
the buttons up.

## The one idea: intents, not buttons

The mistake I avoided early was hardcoding "A clicks, B goes back." Bind your UI to physical buttons and you've written a UI for exactly one device and one user.

So retsurf's input layer never talks about buttons. It talks about **intents** —
an `Action` enum — and a configurable table maps physical gestures onto them
(`src/event/bindings.rs`):

```rust
pub enum Action {
    Confirm,
    Osk,
    // ...
    Scroll,
}
```

The gamepad layer's entire job is to turn SDL events into one of
these, and then hand it to a router that decides what it *means* in the
current context (`src/event/gamepad.rs`):

> Translates controller input into `AppCommand`s — and nothing more. It maps
> physical controls to intents via the configurable `Bindings` table; *what* each
> intent does is decided by the router.

That indirection is what makes everything composable. "Click" is an intent;
where it lands (a page link, a toolbar button, a menu row) is the router's call.

### A gesture is more than a press

Ten or eleven buttons isn't a lot of vocabulary for a whole browser. So each
button is worth more than one binding, by paying attention to *how* it's pressed.
A gesture is a tap, a hold, or a chord, and the defaults use all three
(`src/event/bindings.rs`):

```rust
("a", Action::Confirm),
("b", Action::Cancel),
// ..
("hold:start", Action::Reload),
```

Resolving those gestures is a state machine, and the timing matters.
A button whose *only* binding is a tap can fire immediately on the press —
there's nothing to wait for. But a button that also carries a `hold:` or takes
part in a chord is ambiguous the moment it goes down, so it has to be deferred
(`src/event/gamepad.rs`):

> A button whose only binding is a tap fires immediately on the press. A
> button that also carries a `hold:` binding or takes part in a chord is ambiguous
> on press, so it's *deferred*: tap fires on release (if it comes before
> `hold_ms`), the hold action fires once the threshold passes, and a chord fires
> the moment its second button goes down.

So `hold_ms` is the fork: release before it and
you tapped; cross it and you held. The cost is that a deferred button's tap now
lands on *release* instead of press — a few milliseconds of latency which is invisible in practice and buys you a second action per
button. On a device this starved for inputs, that trade is the whole game.

## Three ways to click a link

Clicking is the problem the web cares about most and the handheld solves worst.
retsurf has three answers.

### 1. Virtual cursor

The most obvious solution for "no mouse" is "fake a mouse." The left stick
moves a dot around the screen; A clicks wherever the dot is. The cursor position
is just a clamped point, nudged each frame by the stick's deflection, and the
D-pad is folded into the same vector so it works as a coarse fallback
(`src/event/gamepad.rs`):

```rust
fn aim(&self) -> (f32, f32) {
    (
        (self.left.0 + self.dpad.0).clamp(-1.0, 1.0),
        (self.left.1 + self.dpad.1).clamp(-1.0, 1.0),
    )
}
```

The clicking part is where it meets Servo. There's no OS pointer to move — so a
press *synthesizes* the mouse events the engine expects, but only when the cursor
is actually over the page rather than the toolbar (`src/app/router.rs`):

```rust
fn primary_action(&mut self, pressed: bool) {
    if self.ui.cursor_over_browser() {
        let (x, y) = self.ui.cursor_browser_rel();
        self.browser
            .handle_input(servo::InputEvent::MouseMove(into_mouse_move_event(x, y)));
        let event = into_mouse_button_event(sdl2::mouse::MouseButton::Left, x, y, pressed);
        self.browser
            .handle_input(servo::InputEvent::MouseButton(event));
    } else {
        self.ui.click_ui(pressed, &self.window);
    }
}
```

A `MouseMove` to set hover state, then a `MouseButton` down/up — exactly the
sequence a real mouse would produce, manufactured from a stick and a button. It
works, and it's honest, and it's *slow*: pixel-aiming a thumbstick at a search
result is the worst part of the whole UX. Worse, it's dead weight on a stickless
device. The virtual cursor is the floor, not the ceiling.

### 2. Scroll mode

That `Action::Scroll` exists for the stickless devices. With no
right stick, the page would be unreachable below. So tapping Start
*toggles* a mode where the left stick and D-pad scroll the page instead of moving
the cursor. It's the one action the
gamepad layer handles itself rather than routing, because it changes the meaning
of every subsequent frame. One physical input, two modes, toggled by a button: a
recurring shape on hardware this constrained.

### 3. Link hints

The real answer is borrowed from [Vimium](https://vimium.github.io/): don't aim
at links, *label* them. Enter hint mode and every clickable thing on the page
gets a little badge; you select the badge and it clicks. No aiming.

First you have to find the clickables. retsurf injects JavaScript into the active
page through Servo and reads back a flat list of rectangles
(`src/browser/mod.rs`):

```javascript
const els = document.querySelectorAll(
    'a[href], button, input:not([type="hidden"]), select, textarea, summary, ' +
    '[onclick], [role="button"], [role="link"], [role="tab"], [contenteditable="true"]'
);
```

Each visible element comes back as its viewport rect plus a URL, capped at 150 so
a page with thousands of links can't flood the IPC channel. So far this is Vimium.
Here's where the handheld adapts it.

Vimium labels its hints with *letters* — you type `fj` to click. retsurf has no
keyboard. So the alphabet isn't letters; it's the buttons themselves. Eight of
them, since A and B are spoken for (confirm and cancel):

```rust
pub enum Sym {
    X, Y, L1, R1, Up, Down, Left, Right,
}
```

Eight symbols means hint codes are just base-8 numbers, with each "digit" drawn as
a button to press. Codes stay as short as the page allows — one button for up to
8 links, two for up to 64, three for up to 512 — and the *nearest* hints get the
shortest codes, ordered by distance from the top of the viewport
(`src/overlay/hints.rs`):

```rust
fn assign_codes(hints: &[Hint], anchor: (f32, f32)) -> Vec<Vec<Sym>> {
    let n = hints.len();
    let len = if n <= 8 { 1 } else if n <= 64 { 2 } else { 3 };
    let mut order: Vec<usize> = (0..n).collect();
    order.sort_by(|&a, &b| {
        dist2(hints[a].center(), anchor).total_cmp(&dist2(hints[b].center(), anchor))
    });
    let mut codes = vec![Vec::new(); n];
    for (rank, &idx) in order.iter().enumerate() {
        codes[idx] = nth_code(rank, len);
    }
    codes
}
```

Then you press buttons, and the typed buffer narrows the field. The matching is
nicer than it sounds because the codes are all the same length and unique, so a
full buffer that still matches *something* matches exactly one thing — no
disambiguating Enter key needed (`src/overlay/hints.rs`):

```rust
pub fn push_sym(&mut self, s: Sym) -> HintInput {
    self.typed.push(s);
    if !(0..self.codes.len()).any(|i| self.has_prefix(i, &self.typed)) {
        self.typed.clear();
        return HintInput::NoMatch;
    }
    let len = self.codes.first().map_or(0, Vec::len);
    if self.typed.len() >= len {
        let idx = (0..self.codes.len())
            .find(|&i| self.codes[i] == self.typed)
            .expect("a full-length prefix match is an exact match");
        self.typed.clear();
        return HintInput::Activate(idx);
    }
    HintInput::Pending
}
```

On screen, as you press buttons, every badge whose code no longer matches your
input fades to 16% opacity. It reads like the page is helping you aim, which is
the whole point.

And because it's two-stage — a D-pad hop to *move the selection*, then a
press to *commit* — hint mode also has to scroll. If you nudge the selection
past the bottom edge with nowhere further to go, the page should scroll to reveal
more hints rather than stick. That's most of `hints_nav`, and it hides the single
most annoying bug in the feature (`src/app/router.rs`):

```rust
let (sx, _) = self.ui.hints_selected_center()
    .unwrap_or_else(|| self.ui.cursor_browser_rel());
let sy = height / 2.0;
let chunk = dy as f32 * height * HINT_EDGE_SCROLL_FRACTION;
self.browser.scroll(0.0, chunk, sx, sy);
```

The bug: Servo decides *which* element scrolls by hit-testing the point you
scroll from. The hint sitting at the very top edge is usually inside a sticky
header — DuckDuckGo's search bar, a site nav — and a sticky header doesn't scroll
the document. So scrolling "from" that hint moved nothing, and the page looked
frozen. The fix is to keep the hint's horizontal column (so a hint living in a
nested scroller still scrolls *that*) but hit-test at mid-viewport height, which
lands on the main content. After the scroll settles, the hints are re-collected
and the selection re-anchors to the freshly revealed edge. A genuinely
handheld-specific bug — it only exists because the cursor isn't a real pointer and
the scroll has to be aimed.

## Typing without a keyboard

Clicking solved, the other missing device is the keyboard. You can't browse
without typing a URL or a search at least once, so retsurf ships its own on-screen
keyboard — an egui grid you walk with the D-pad. The state is exactly what you'd
guess: a row, a column, and a stack of layouts (`src/overlay/osk.rs`):

```rust
pub struct Osk {
    visible: bool,
    caps: bool,
    caret: usize,
    row: usize,
    col: usize,
    layouts: Vec<Layout>,
    lang: usize,
}
```

D-pad navigation is just clamped grid movement, re-clamping the column on each row
change because rows aren't the same width:

```rust
fn move_sel(&mut self, dx: i32, dy: i32) {
    let rows = self.layout().keys.len() as i32;
    self.row = (self.row as i32 + dy).clamp(0, rows - 1) as usize;
    let cols = self.layout().keys[self.row].len() as i32;
    self.col = (self.col as i32 + dx).clamp(0, cols - 1) as usize;
}
```

But D-pad-walking to every key is tedious, so the buttons you press most often
get dedicated shortcuts that skip the grid entirely: X is Backspace, Y is Space,
L2 is a momentary Shift, R2 is Enter. There's more than one layout, too — QWERTY
and a Cyrillic ЙЦУКЕН — and a Lang key cycles them, because "type a URL" and "type
a search in Russian" are different jobs.

The piece that makes the OSK reusable is that it doesn't know where the text
goes. It writes to a target the caller supplies (`src/overlay/osk.rs`):

```rust
pub enum OskTarget<'a> {
    AddressBar,
    Prompt(&'a mut String),
    // ..
    Page,
}
```

Most targets are just a string buffer the OSK edits in place. The interesting one
is `Page`: typing into a focused `<input>` on a website, where there's no buffer
to edit — so each character is turned back into a synthesized key-down/key-up pair
and handed to Servo, the keyboard mirror image of how the cursor synthesizes
mouse events. The same trick, the other input device.

## Menus you walk with a D-pad

Tabs, bookmarks, history, downloads — the chrome of the browser — are full-screen
overlays rather than dropdowns, because a dropdown is a thing you point at.
Navigation is the same selection model as everything else: the D-pad moves within
the active section, the shoulders switch sections, and the selected row scrolls
itself into view so the off-screen selection never gets lost
(`src/overlay/menu.rs`):

```rust
pub fn move_sel(&mut self, dy: i32) {
    match self.section {
        Section::Bookmarks => self.bookmarks.move_sel(dy),
        Section::History   => self.history.move_sel(dy),
        Section::Downloads => self.downloads.move_sel(dy),
        Section::Tabs => {
            let last = self.tab_count as i32;
            self.tab_selected = (self.tab_selected as i32 + dy).clamp(0, last) as usize;
        }
    }
}
```

There's nothing clever here, and that's the point: once "selection plus confirm"
is your universal idiom, every list-shaped surface in the app is the same handful
of lines. The cursor, the hints, the keyboard, the menus — they're all
selection-and-commit wearing different clothes.

## The move that ties it together: rebind it yourself

The constraint I put off the longest. No two of these handhelds have the same
buttons. Some have two sticks, some have one, some have none. The defaults above
are a guess, but a guess can't be right for every device and user — so the
bindings have to be editable.

Except: you edit config files with a keyboard, and the entire premise of this post
is that there *is* no keyboard. A `bindings.toml` you can only edit by pulling the
SD card and mounting it on a real computer is not a feature a handheld user will
ever touch. So rebinding has to happen *in the app*, driven by the gamepad,
which means the cleanest possible UX: to bind an action, you press the button you
want.

That capture flow is a small mode flip. When you activate "add a binding," the
settings overlay records which action is listening (`src/overlay/settings.rs`):

```rust
pub struct Settings {
    // ...
    capturing: Option<Action>,   // Some(action) while waiting for a gesture
}
```

While that's `Some`, the event handler intercepts input *before* it reaches the
normal dispatch — otherwise pressing A to bind it would just fire A's existing
"confirm" action. For the keyboard side (capture works for keyboard shortcuts too,
on devices that have one), it grabs the keystroke, ignores modifiers, and turns
the rest into a gesture string (`src/event/handler.rs`):

```rust
if ui.settings_capturing() {
    match event {
        Event::KeyDown { keycode: Some(kc), keymod, repeat: false, .. } => {
            if kc == Keycode::Escape {
                commands.push(/* cancel capture */);
            } else if is_modifier_key(kc) {
                return;                          // wait for the real key
            } else if let Some(gesture) = bindings::format_key(kc, keymod) {
                commands.push(/* CaptureBinding { gesture, keyboard: true } */);
            }
            return;
        }
        // ...swallow key-up and text-input so nothing leaks through
    }
}
```

The gamepad side runs the *same* tap/hold/chord resolution the live UI uses, so
you can capture "hold Select" or "L1+R1" exactly the way you'd later perform it,
and it formats the result with the same vocabulary the defaults are written in
(`src/event/bindings.rs`):

```rust
pub(crate) fn button_name(button: Button) -> Option<&'static str> {
    Some(match button {
        Button::A => "a",    Button::B => "b",
        Button::X => "x",    Button::Y => "y",
        Button::LeftShoulder => "l1",  Button::RightShoulder => "r1",
        Button::Start => "start",      Button::Back => "select",
        // ...
        _ => return None,
    })
}
```

There's one last detail: capture mode needs an escape hatch — what if you open it
by accident and there's no Esc key to cancel with? On a device with nothing but a
gamepad, the answer is a timeout:

```rust
/// Auto-cancel binding capture if nothing is pressed for this long — the handheld
/// escape hatch (there's no Esc), so an accidental "add" doesn't trap input.
const CAPTURE_TIMEOUT: Duration = Duration::from_secs(6);
```

If you don't press anything for six seconds, capture quietly gives up and hands
input back. The lack of a keyboard isn't a problem you solve once at the URL bar;
it's a constraint that follows you into every corner of the UI, including the menu
where you configure the buttons.

## The payoff: the same trick on a keyboard

Everything so far assumed there's no keyboard, which is true of a bare handheld.
But retsurf also builds an Android APK — the subject of a later post — and on a
phone the keyboard is suddenly back on the table: a Bluetooth one, or the hardware
QWERTY of a phone built around one. This is where the "intents, not buttons"
detour collects its reward. A keyboard isn't a second control scheme to design and
maintain; it's a second binding table over the exact same `Action`s.

That's literally the shape of `bindings.toml` — two maps, one vocabulary
(`src/event/bindings.rs`):

```rust
pub struct Store {
    pub gamepad: BTreeMap<String, String>,
    pub keyboard: BTreeMap<String, String>,
}
```

And `src/event/keyboard.rs` describes itself as the mirror of the gamepad layer:

> Translates raw keyboard input into `AppCommand`s — the keyboard counterpart of
> `gamepad`. It owns the `[keyboard]` table of `bindings.toml` and applies the
> firing rules: `nav_*` steps need an open overlay (and auto-repeat while held),
> plain shortcuts (no Ctrl/Alt) are muted while anything editable has focus, and
> the menu / hint overlays get their fixed keys first. Whatever isn't consumed is
> forwarded to the page as a Servo keyboard event.

The default map is what a browser user's fingers already expect, with a Vimium
streak (`src/event/bindings.rs`):

```rust
("ctrl+r", Action::Reload),
("f", Action::Hints),
// ..
("enter", Action::Confirm),
("backspace", Action::Cancel),
```

`f` is bound straight to `Action::Hints` — the very intent the Y button fires.
Press `f` and link-hint mode lights up; from there you hop the selection with
`hjkl` or the arrows and press Enter, where a gamepad would type the button-combo
from a few sections back. Two ways to pick a hint, one underlying `activate_hint`.

The tricky part of a keyboard-driven browser is a collision the gamepad
never has: a plain `f` should *open hints* while you're reading, but type the
letter *f* when you're in a search box. A bare letter can't be both a shortcut and
a character unless something decides which, per keystroke. That decision is four
lines (`src/event/keyboard.rs`):

```rust
fn lookup(&self, key: &KeyEvent, overlay: bool, typing: bool) -> Option<Action> {
    let (action, plain) = self.bindings.lookup(key.kc, key.keymod)?;
    let fire = if action.is_nav() {
        overlay
    } else {
        !key.repeat && (!plain || !typing)
    };
    fire.then_some(action)
}
```

A binding with no modifier (`plain`) fires only when nothing editable has focus
(`!typing`); the moment a text field or the address bar takes focus, `f` and
`hjkl` stop being shortcuts and flow through as characters. A `nav_*` step only
fires while an overlay is open, so the arrows drive a menu but scroll the page when
no menu is up. Ctrl-combos fire unconditionally — `Ctrl+R` reloads whether you're
typing or not. Three rules, and the keyboard stops fighting the text box.

Android has one more device-specific control into the same scheme. The phone's
gesture or hardware Back arrives as a key event, and it maps to the focus-aware
`Cancel` intent — close the open overlay, or navigate back on the page
(`src/event/keyboard.rs`):

```rust
if key.kc == Keycode::AcBack {
    if key.pressed && !key.repeat {
        commands.push(AppCommand::Input(InputCommand::Cancel));
    }
    return;
}
```

So swipe-Back on Android, tap-B on a gamepad, and Backspace on a keyboard are three
unrelated physical events that all resolve to one intent — `Cancel` — and the
router does the same focus-aware thing for each. Anything no table claims falls
through to the page as a real Servo keyboard event, so typing into a web form just
works. And the keyboard map rebinds through the very same capture flow from the
last section — its `[keyboard]` half — so a QWERTY-phone user reshapes their
shortcuts without touching a config file either.

The architecture is paying off. I planned to drive a browser with a gamepad and
ended up with an input layer that drives it from a gamepad, a touchscreen, and a full keyboard — because none of them were ever wired to the UI
directly. They were wired to intents.
