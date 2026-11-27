// Monitor sound effects, synthesised with Web Audio: no audio files.
// Off by default; the `sound` CLI command and the on-screen menu switch them, and
// the choice is saved to localStorage. Browsers start audio only after a user
// gesture, so effects fired before the first key press or click are dropped.

const STORAGE_KEY = "sound";
const MAINS_HZ = 50;
// Gain a fading voice ramps to; exponential ramps cannot reach zero.
const SILENT = 0.0001;
// The clock reads late on the main thread; a voice shorter than that lag,
// started at its reading, would end before it plays.
const SCHEDULE_AHEAD_S = 0.02;
// Longest noise burst any sound plays, and the seed of its samples.
const NOISE_S = 1;
const NOISE_SEED = 0x2545f491;
// One static snap: SNAP_S long, its level falling by e^SNAP_DECAY across it.
const SNAP_S = 0.004;
const SNAP_DECAY = 4;
const KEY_HZ = 5000;
// Share of KEY_HZ a keyclick's pitch may stray, in total.
const KEY_SPREAD = 0.2;
const BELL_HZ = 880;

let enabled = readEnabled();
let audio = null;
const noiseBuffers = new WeakMap();

export function isSoundOn() {
  return enabled;
}

export function setSound(on) {
  enabled = on;
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
  SOUNDS[name](audio, audio.currentTime + SCHEDULE_AHEAD_S);
}

const SOUNDS = {
  click(ac, at) {
    noise(ac, { at, duration: 0.012, freq: 3500, q: 1, gain: 0.3 });
  },

  powerOn(ac, at) {
    relay(ac, at);
    degaussCoil(ac, at + 0.04, 1.1);
  },

  powerOff(ac, at) {
    relay(ac, at);
    // The picture collapsing, then the tube discharging.
    tone(ac, { at, duration: 0.16, from: 85, to: 40, gain: 0.35 });
    crackle(ac, { at: at + 0.06, duration: 0.5, rate: 8, gain: 0.25 });
  },

  // A menu choice landing: a dull tock.
  select(ac, at) {
    noise(ac, { at, duration: 0.025, freq: 1200, q: 1.5, gain: 1 });
  },

  // Terminal keyclick, pitched a little differently each time.
  key(ac, at) {
    const freq = KEY_HZ * (1 + KEY_SPREAD * (Math.random() - 0.5));
    noise(ac, { at, duration: 0.005, freq, q: 2, gain: 0.4 });
  },

  // Terminal bell.
  bell(ac, at) {
    tone(ac, { at, duration: 0.15, from: BELL_HZ, to: BELL_HZ, type: "square", gain: 0.08 });
  },

  channel(ac, at) {
    SOUNDS.click(ac, at);
    // Static between stations.
    noise(ac, { at: at + 0.02, duration: 0.3, freq: 4000, q: 0.4, gain: 0.12 });
  },

  degauss(ac, at) {
    degaussCoil(ac, at, 1.2);
  },
};

// Plays a mechanical switch: the contact snap, its bounce and the housing's knock.
function relay(ac, at) {
  noise(ac, { at, duration: 0.008, freq: 4000, q: 0.8, gain: 0.6 });
  noise(ac, { at: at + 0.014, duration: 0.006, freq: 3000, q: 0.8, gain: 0.25 });
  tone(ac, { at, duration: 0.06, from: 180, to: 90, gain: 0.35 });
}

// Plays the degauss coil: a thump, then hum dying away with the coil's current.
function degaussCoil(ac, at, duration) {
  tone(ac, { at, duration: 0.18, from: 75, to: 45, gain: 0.6 });

  const osc = ac.createOscillator();
  osc.type = "sawtooth";
  // Magnetostriction hums at twice the mains frequency.
  osc.frequency.value = 2 * MAINS_HZ;
  const filter = ac.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 500;
  osc.connect(filter).connect(fade(ac, at, duration, 0.3, 0.03));
  osc.start(at);
  osc.stop(at + duration);

  tone(ac, { at, duration, from: MAINS_HZ, to: MAINS_HZ, gain: 0.2 });
}

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
  const src = ac.createBufferSource();
  src.buffer = noiseBuffer(ac);
  const filter = ac.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = freq;
  filter.Q.value = q;
  src.connect(filter).connect(fade(ac, at, duration, gain));
  src.start(at, 0, duration);
}

// Returns the context's white noise, the same samples on every call and page load,
// so a short burst is equally loud each time; NOISE_S long.
function noiseBuffer(ac) {
  let buffer = noiseBuffers.get(ac);
  if (buffer) return buffer;

  buffer = ac.createBuffer(1, Math.ceil(ac.sampleRate * NOISE_S), ac.sampleRate);
  const data = buffer.getChannelData(0);
  // xorshift32 from NOISE_SEED.
  let x = NOISE_SEED;
  for (let i = 0; i < data.length; i++) {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    data[i] = (x >>> 0) / 2 ** 31 - 1;
  }
  noiseBuffers.set(ac, buffer);
  return buffer;
}

// Plays static: random snaps, `rate` per second at first, thinning out to none.
function crackle(ac, { at, duration, rate, gain }) {
  const length = Math.ceil(ac.sampleRate * duration);
  const buffer = ac.createBuffer(1, length, ac.sampleRate);
  const data = buffer.getChannelData(0);
  const snapLength = Math.ceil(ac.sampleRate * SNAP_S);
  for (let i = 0; i < length; i++) {
    const chance = (rate * (1 - i / length)) / ac.sampleRate;
    if (Math.random() >= chance) continue;

    const level = Math.random();
    for (let j = 0; j < snapLength && i + j < length; j++) {
      data[i + j] += level * (Math.random() * 2 - 1) * Math.exp((-SNAP_DECAY * j) / snapLength);
    }
  }

  const src = ac.createBufferSource();
  src.buffer = buffer;
  const filter = ac.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.value = 1500;
  const amp = ac.createGain();
  amp.gain.value = gain;
  src.connect(filter).connect(amp).connect(ac.destination);
  src.start(at);
}

// Returns a gain node wired to the output that rises to `gain` over `attack`,
// then fades to silence by the end of `duration`.
function fade(ac, at, duration, gain, attack = 0) {
  const amp = ac.createGain();
  if (attack > 0) {
    amp.gain.setValueAtTime(SILENT, at);
    amp.gain.exponentialRampToValueAtTime(gain, at + attack);
  } else {
    amp.gain.setValueAtTime(gain, at);
  }
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
