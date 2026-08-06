/**
 * The kinetic tiles' sound, synthesised with Web Audio rather than loaded from a
 * file: nothing to licence, nothing to download, and it stays in step with
 * whatever duration the tile animates at.
 *
 * Browsers only allow audio after a user gesture, so the context is unlocked on
 * the first pointer/key event — hovering before that stays silent.
 */

let ctx: AudioContext | null = null;

type WebkitWindow = Window & { webkitAudioContext?: typeof AudioContext };

function context(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (ctx) return ctx;

  const Ctor = window.AudioContext ?? (window as WebkitWindow).webkitAudioContext;
  if (!Ctor) return null;

  ctx = new Ctor();

  // Browsers only let audio start from a real user gesture, and hovering is not
  // one. These are the events that do count, listened for as widely as the
  // platforms differ: Safari has historically honoured touchend and click where
  // it ignored pointerdown. They unhook themselves once the context is running.
  const events = ["pointerdown", "pointerup", "touchstart", "touchend", "click", "keydown"];
  const unlock = () => {
    if (!ctx) return;
    if (ctx.state === "running") {
      events.forEach((type) => window.removeEventListener(type, unlock));
      return;
    }
    void ctx.resume().catch(() => {});
  };
  events.forEach((type) =>
    window.addEventListener(type, unlock, { passive: true }),
  );
  return ctx;
}

/**
 * Creates the context and starts listening for the gesture that unlocks it.
 *
 * Call this on mount, not on first hover: the unlock listeners live inside
 * `context()`, so if they were only attached when a tile is first hovered, a
 * visitor who clicks *before* hovering would arm nothing, and their click —
 * the one gesture that could have unlocked audio — would be wasted.
 */
export function primeKineticAudio() {
  context();
}

function noise(ac: AudioContext, seconds: number) {
  const buffer = ac.createBuffer(1, Math.ceil(ac.sampleRate * seconds), ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
  return buffer;
}

/** Gain envelopes can't ramp to zero exponentially, so silence is this. */
const OFF = 0.0001;

export type KineticVoice =
  | "bowed"
  | "pluck"
  | "glass"
  | "felt"
  | "choir"
  | "swell";

/**
 * Felt piano: a struck low note with a soft hammer transient and a sub an octave
 * down for weight, decaying into a mellow tail. Attack gives it force; the
 * filtered decay keeps it from sounding like an interface beep.
 */
function felt(ac: AudioContext, out: GainNode, duration: number, base: number) {
  const now = ac.currentTime;
  const tail = Math.min(duration, 2.4);

  const body = ac.createGain();
  body.gain.setValueAtTime(OFF, now);
  body.gain.exponentialRampToValueAtTime(0.5, now + 0.015);
  body.gain.exponentialRampToValueAtTime(OFF, now + tail);

  const tone = ac.createBiquadFilter();
  tone.type = "lowpass";
  tone.frequency.setValueAtTime(2800, now);
  tone.frequency.exponentialRampToValueAtTime(600, now + tail * 0.7);
  body.connect(tone).connect(out);

  ([[1, 1], [2, 0.34], [3, 0.12], [1.5, 0.18]] as const).forEach(([mult, level], i) => {
    const osc = ac.createOscillator();
    osc.type = i === 0 ? "triangle" : "sine";
    osc.frequency.value = base * mult;
    const gain = ac.createGain();
    gain.gain.value = level;
    osc.connect(gain).connect(body);
    osc.start(now);
    osc.stop(now + tail + 0.1);
  });

  const sub = ac.createOscillator();
  sub.type = "sine";
  sub.frequency.value = base / 2;
  const subGain = ac.createGain();
  subGain.gain.setValueAtTime(OFF, now);
  subGain.gain.exponentialRampToValueAtTime(0.34, now + 0.05);
  subGain.gain.exponentialRampToValueAtTime(OFF, now + tail * 0.85);
  sub.connect(subGain).connect(out);
  sub.start(now);
  sub.stop(now + tail + 0.1);

  const hammer = ac.createBufferSource();
  hammer.buffer = noise(ac, 0.12);
  const hammerTone = ac.createBiquadFilter();
  hammerTone.type = "bandpass";
  hammerTone.frequency.value = 1700;
  hammerTone.Q.value = 0.7;
  const hammerGain = ac.createGain();
  hammerGain.gain.setValueAtTime(0.1, now);
  hammerGain.gain.exponentialRampToValueAtTime(OFF, now + 0.09);
  hammer.connect(hammerTone).connect(hammerGain).connect(out);
  hammer.start(now);
}

/**
 * Choir pad: detuned pairs on root, fifth and octave with a slow attack. No
 * transient at all — the force comes from the stacked harmonics rather than a
 * hit, so it stays soft while still filling the room.
 */
function choir(ac: AudioContext, out: GainNode, duration: number, base: number) {
  const now = ac.currentTime;
  const peak = now + duration * 0.45;
  const end = now + duration;

  const swellGain = ac.createGain();
  swellGain.gain.setValueAtTime(OFF, now);
  swellGain.gain.exponentialRampToValueAtTime(0.26, peak);
  swellGain.gain.exponentialRampToValueAtTime(OFF, end);

  const tone = ac.createBiquadFilter();
  tone.type = "lowpass";
  tone.frequency.setValueAtTime(700, now);
  tone.frequency.linearRampToValueAtTime(1900, peak);
  tone.frequency.linearRampToValueAtTime(700, end);
  swellGain.connect(tone).connect(out);

  ([[1, 1], [1.5, 0.6], [2, 0.5], [3, 0.2]] as const).forEach(([mult, level]) => {
    [-6, 6].forEach((cents) => {
      const osc = ac.createOscillator();
      osc.type = "triangle";
      osc.frequency.value = base * mult;
      osc.detune.value = cents;
      const gain = ac.createGain();
      gain.gain.value = level * 0.5;
      osc.connect(gain).connect(swellGain);
      osc.start(now);
      osc.stop(end + 0.1);
    });
  });
}

/**
 * Cinematic sub swell: a deep sine that rises and falls with the zoom, a fifth
 * above it for pitch, and a band of air over the top. Felt more than heard —
 * the most "powerful" of the three and the least melodic.
 */
function swell(ac: AudioContext, out: GainNode, duration: number, base: number) {
  const now = ac.currentTime;
  const peak = now + duration * 0.45;
  const end = now + duration;

  const low = ac.createOscillator();
  low.type = "sine";
  low.frequency.setValueAtTime(base / 2, now);
  low.frequency.linearRampToValueAtTime(base * 0.75, peak);
  low.frequency.linearRampToValueAtTime(base / 2, end);
  const lowGain = ac.createGain();
  lowGain.gain.setValueAtTime(OFF, now);
  lowGain.gain.exponentialRampToValueAtTime(0.55, peak);
  lowGain.gain.exponentialRampToValueAtTime(OFF, end);
  low.connect(lowGain).connect(out);
  low.start(now);
  low.stop(end + 0.1);

  const fifth = ac.createOscillator();
  fifth.type = "sine";
  fifth.frequency.value = base * 0.75;
  const fifthGain = ac.createGain();
  fifthGain.gain.setValueAtTime(OFF, now);
  fifthGain.gain.exponentialRampToValueAtTime(0.12, peak);
  fifthGain.gain.exponentialRampToValueAtTime(OFF, end);
  fifth.connect(fifthGain).connect(out);
  fifth.start(now);
  fifth.stop(end + 0.1);

  const air = ac.createBufferSource();
  air.buffer = noise(ac, duration + 0.2);
  const airTone = ac.createBiquadFilter();
  airTone.type = "bandpass";
  airTone.Q.value = 0.8;
  airTone.frequency.setValueAtTime(700, now);
  airTone.frequency.linearRampToValueAtTime(3000, peak);
  airTone.frequency.linearRampToValueAtTime(700, end);
  const airGain = ac.createGain();
  airGain.gain.setValueAtTime(OFF, now);
  airGain.gain.exponentialRampToValueAtTime(0.05, peak);
  airGain.gain.exponentialRampToValueAtTime(OFF, end);
  air.connect(airTone).connect(airGain).connect(out);
  air.start(now);
}


/**
 * Bowed strings: detuned saws opened by a filter that follows the zoom, with a
 * slow bow attack, a touch of vibrato and a sub underneath. Power without a hit
 * — the force builds instead of striking.
 */
function bowed(ac: AudioContext, out: GainNode, duration: number, base: number) {
  const now = ac.currentTime;
  const peak = now + duration * 0.45;
  const end = now + duration;

  const bow = ac.createGain();
  bow.gain.setValueAtTime(OFF, now);
  bow.gain.exponentialRampToValueAtTime(0.3, now + 0.35);
  bow.gain.exponentialRampToValueAtTime(0.34, peak);
  bow.gain.exponentialRampToValueAtTime(OFF, end);

  const tone = ac.createBiquadFilter();
  tone.type = "lowpass";
  tone.Q.value = 1.2;
  tone.frequency.setValueAtTime(420, now);
  tone.frequency.linearRampToValueAtTime(2100, peak);
  tone.frequency.linearRampToValueAtTime(420, end);
  bow.connect(tone).connect(out);

  // Slow vibrato, shared by every string so they stay in tune with each other.
  const vibrato = ac.createOscillator();
  vibrato.frequency.value = 4.8;
  const vibratoDepth = ac.createGain();
  vibratoDepth.gain.setValueAtTime(0, now);
  vibratoDepth.gain.linearRampToValueAtTime(7, peak);
  vibrato.connect(vibratoDepth);
  vibrato.start(now);
  vibrato.stop(end + 0.1);

  ([[1, 1], [1.5, 0.55], [2, 0.4]] as const).forEach(([mult, level]) => {
    [-7, 7].forEach((cents) => {
      const osc = ac.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.value = base * mult;
      osc.detune.value = cents;
      vibratoDepth.connect(osc.detune);
      const gain = ac.createGain();
      gain.gain.value = level * 0.4;
      osc.connect(gain).connect(bow);
      osc.start(now);
      osc.stop(end + 0.1);
    });
  });

  const sub = ac.createOscillator();
  sub.type = "sine";
  sub.frequency.value = base / 2;
  const subGain = ac.createGain();
  subGain.gain.setValueAtTime(OFF, now);
  subGain.gain.exponentialRampToValueAtTime(0.3, peak);
  subGain.gain.exponentialRampToValueAtTime(OFF, end);
  sub.connect(subGain).connect(out);
  sub.start(now);
  sub.stop(end + 0.1);
}

/**
 * Struck string, santur-like: a bright transient into a resonant body with a
 * fast decay, doubled a fifth up and a few milliseconds late the way a pair of
 * mallets lands. Delicate, but it starts with a real attack.
 */
function pluck(ac: AudioContext, out: GainNode, duration: number, base: number) {
  const now = ac.currentTime;

  const strike = (at: number, freq: number, level: number) => {
    const ring = ac.createGain();
    ring.gain.setValueAtTime(OFF, at);
    ring.gain.exponentialRampToValueAtTime(level, at + 0.006);
    ring.gain.exponentialRampToValueAtTime(OFF, at + 1.5);

    const body = ac.createBiquadFilter();
    body.type = "bandpass";
    body.Q.value = 1.4;
    body.frequency.setValueAtTime(freq * 3.2, at);
    body.frequency.exponentialRampToValueAtTime(freq * 1.2, at + 0.9);
    ring.connect(body).connect(out);

    // Slightly inharmonic partials are what make it read as struck metal
    // rather than a synthesised tone.
    ([[1, 1], [2.01, 0.4], [3.03, 0.16], [4.98, 0.07]] as const).forEach(
      ([mult, partial], i) => {
        const osc = ac.createOscillator();
        osc.type = i === 0 ? "triangle" : "sine";
        osc.frequency.value = freq * mult;
        const gain = ac.createGain();
        gain.gain.value = partial;
        osc.connect(gain).connect(ring);
        osc.start(at);
        osc.stop(at + 1.7);
      },
    );

    const hit = ac.createBufferSource();
    hit.buffer = noise(ac, 0.05);
    const hitTone = ac.createBiquadFilter();
    hitTone.type = "highpass";
    hitTone.frequency.value = 2200;
    const hitGain = ac.createGain();
    hitGain.gain.setValueAtTime(0.05, at);
    hitGain.gain.exponentialRampToValueAtTime(OFF, at + 0.04);
    hit.connect(hitTone).connect(hitGain).connect(out);
    hit.start(at);
  };

  strike(now, base, 0.42);
  strike(now + 0.055, base * 1.5, 0.24);

  const sub = ac.createOscillator();
  sub.type = "sine";
  sub.frequency.value = base / 2;
  const subGain = ac.createGain();
  subGain.gain.setValueAtTime(OFF, now);
  subGain.gain.exponentialRampToValueAtTime(0.28, now + 0.04);
  subGain.gain.exponentialRampToValueAtTime(OFF, now + Math.min(duration, 1.6));
  sub.connect(subGain).connect(out);
  sub.start(now);
  sub.stop(now + duration + 0.1);
}

/**
 * Glass: high partials that shimmer in and ring out over a deep sub. The
 * delicacy is all in the top octaves, the weight entirely underneath — the two
 * ends of the spectrum with nothing muddy in the middle.
 */
function glass(ac: AudioContext, out: GainNode, duration: number, base: number) {
  const now = ac.currentTime;
  const tail = Math.min(duration, 2.6);

  const shimmer = ac.createGain();
  shimmer.gain.setValueAtTime(OFF, now);
  shimmer.gain.exponentialRampToValueAtTime(0.16, now + 0.08);
  shimmer.gain.exponentialRampToValueAtTime(OFF, now + tail);

  const air = ac.createBiquadFilter();
  air.type = "highpass";
  air.frequency.value = 900;
  shimmer.connect(air).connect(out);

  ([[4, 1], [6, 0.5], [8, 0.3], [11, 0.14]] as const).forEach(([mult, level]) => {
    const osc = ac.createOscillator();
    osc.type = "sine";
    osc.frequency.value = base * mult;
    const gain = ac.createGain();
    gain.gain.setValueAtTime(OFF, now);
    gain.gain.exponentialRampToValueAtTime(level, now + 0.06 * mult * 0.25);
    gain.gain.exponentialRampToValueAtTime(OFF, now + tail * (1 - mult * 0.04));
    osc.connect(gain).connect(shimmer);
    osc.start(now);
    osc.stop(now + tail + 0.1);
  });

  const sub = ac.createOscillator();
  sub.type = "sine";
  sub.frequency.value = base / 2;
  const subGain = ac.createGain();
  subGain.gain.setValueAtTime(OFF, now);
  subGain.gain.exponentialRampToValueAtTime(0.5, now + 0.12);
  subGain.gain.exponentialRampToValueAtTime(OFF, now + tail * 0.8);
  sub.connect(subGain).connect(out);
  sub.start(now);
  sub.stop(now + tail + 0.1);
}

const VOICES: Record<
  KineticVoice,
  { play: typeof felt; level: number }
> = {
  bowed: { play: bowed, level: 0.5 },
  pluck: { play: pluck, level: 0.55 },
  glass: { play: glass, level: 0.5 },
  felt: { play: felt, level: 0.5 },
  choir: { play: choir, level: 0.5 },
  swell: { play: swell, level: 0.42 },
};

/**
 * Renders one hit of a voice offline and returns its peak amplitude, 0-1. No
 * speakers involved, so it answers "does this voice actually make a sound?"
 * separately from "is the browser letting us play it?".
 */
export async function renderVoicePeak(
  voice: KineticVoice,
  duration: number,
  base = 146,
): Promise<number> {
  const Ctor =
    window.OfflineAudioContext ??
    (window as unknown as { webkitOfflineAudioContext?: typeof OfflineAudioContext })
      .webkitOfflineAudioContext;
  if (!Ctor) return -1;

  const offline = new Ctor(1, Math.ceil(44100 * (duration + 0.3)), 44100);
  const { play, level } = VOICES[voice];
  const master = offline.createGain();
  master.gain.value = level;
  master.connect(offline.destination);
  play(offline as unknown as AudioContext, master, duration, base);

  const rendered = await offline.startRendering();
  const data = rendered.getChannelData(0);
  let peak = 0;
  for (let i = 0; i < data.length; i += 1) {
    const v = Math.abs(data[i]);
    if (v > peak) peak = v;
  }
  return peak;
}

/**
 * Loops a voice in step with the tile animation. Returns a stop function that
 * fades out rather than cutting, so leaving the tile doesn't click.
 */
export function startKineticSound(
  duration: number,
  base = 174,
  voice: KineticVoice = "bowed",
): () => void {
  const ac = context();
  if (!ac) return () => {};
  if (ac.state === "suspended") void ac.resume().catch(() => {});

  const { play, level } = VOICES[voice];
  const master = ac.createGain();
  master.gain.value = level;
  master.connect(ac.destination);

  play(ac, master, duration, base);
  const id = window.setInterval(
    () => play(ac, master, duration, base),
    duration * 1000,
  );

  return () => {
    window.clearInterval(id);
    const t = ac.currentTime;
    master.gain.cancelScheduledValues(t);
    master.gain.setValueAtTime(master.gain.value, t);
    master.gain.linearRampToValueAtTime(0, t + 0.25);
    window.setTimeout(() => master.disconnect(), 400);
  };
}
