// Monitor sound effects, synthesised with Web Audio: no audio files.
// Off by default; the `sound` CLI command and the case key switch them, and
// the choice is saved to localStorage. Browsers start audio only after a user
// gesture, so effects fired before the first key press or click are dropped.

const STORAGE_KEY = "sound";
const MAINS_HZ = 50;
// Gain a fading voice ramps to; exponential ramps cannot reach zero.
const SILENT = 0.0001;

let enabled = readEnabled();
let audio = null;

export function isSoundOn() {
  return enabled;
}

// Marks every sound toggle pressed or not to match the current state.
export function syncSoundToggles() {
  document.querySelectorAll("[data-sound-toggle]").forEach((btn) => {
    btn.setAttribute("aria-pressed", String(enabled));
  });
}

export function setSound(on) {
  enabled = on;
  syncSoundToggles();
  try {
    localStorage.setItem(STORAGE_KEY, on ? "on" : "off");
  } catch (e) {
    /* ignore storage errors (private mode, quota, etc.) */
  }
  if (on) playSound("click");
}

export function toggleSound() {
  setSound(!enabled);
  return enabled;
}

// Plays one of SOUNDS by name when sound is on.
export function playSound(name) {
  if (!enabled) return;

  audio ??= new AudioContext();
  if (audio.state === "suspended") audio.resume();
  SOUNDS[name](audio, audio.currentTime);
}

const SOUNDS = {
  click(ac, at) {
    noise(ac, { at, duration: 0.03, freq: 3000, q: 0.7, gain: 0.4 });
  },

  powerOn(ac, at) {
    SOUNDS.click(ac, at);
    tone(ac, { at, duration: 0.3, from: 110, to: 40, gain: 0.5 });
    // Static crackle as the tube charges.
    noise(ac, { at: at + 0.05, duration: 0.6, freq: 2500, q: 0.5, gain: 0.15 });
  },

  powerOff(ac, at) {
    SOUNDS.click(ac, at);
    tone(ac, { at, duration: 0.35, from: 900, to: 50, gain: 0.15 });
  },

  degauss(ac, at) {
    tone(ac, { at, duration: 0.15, from: 120, to: 50, gain: 0.5 });
    // Mains hum through the coil, with its second harmonic.
    tone(ac, { at, duration: 1.1, from: MAINS_HZ, to: MAINS_HZ, type: "sawtooth", gain: 0.12 });
    tone(ac, { at, duration: 1.1, from: 2 * MAINS_HZ, to: 2 * MAINS_HZ, type: "square", gain: 0.03 });
  },
};

// Plays a tone gliding from `from` to `to` Hz while it fades out.
function tone(ac, { at, duration, from, to, type = "sine", gain }) {
  const osc = ac.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(from, at);
  osc.frequency.exponentialRampToValueAtTime(to, at + duration);
  osc.connect(fade(ac, at, duration, gain));
  osc.start(at);
  osc.stop(at + duration);
}

// Plays a fading burst of white noise through a band-pass filter.
function noise(ac, { at, duration, freq, q, gain }) {
  const buffer = ac.createBuffer(1, Math.ceil(ac.sampleRate * duration), ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

  const src = ac.createBufferSource();
  src.buffer = buffer;
  const filter = ac.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = freq;
  filter.Q.value = q;
  src.connect(filter).connect(fade(ac, at, duration, gain));
  src.start(at);
  src.stop(at + duration);
}

// Returns a gain node wired to the output that fades from `gain` to silence.
function fade(ac, at, duration, gain) {
  const amp = ac.createGain();
  amp.gain.setValueAtTime(gain, at);
  amp.gain.exponentialRampToValueAtTime(SILENT, at + duration);
  amp.connect(ac.destination);
  return amp;
}

function readEnabled() {
  try {
    return localStorage.getItem(STORAGE_KEY) === "on";
  } catch (e) {
    return false;
  }
}
