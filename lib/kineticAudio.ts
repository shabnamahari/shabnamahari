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


/** Gain envelopes can't ramp to zero exponentially, so silence is this. */
const OFF = 0.0001;

export type KineticVoice = "bowed";





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



const VOICES: Record<KineticVoice, { play: typeof bowed; level: number }> = {
  bowed: { play: bowed, level: 1.15 },
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

/** What the browser's audio engine is doing right now, for on-screen diagnosis. */
export function audioState(): string {
  if (!ctx) return "not created yet";
  return ctx.state;
}

/**
 * A plain, loud, mid-range beep. Nothing musical about it — it exists so that
 * "I hear nothing" can be split into "the browser is blocking audio" and "the
 * sound is playing but too subtle to notice".
 */
export function playTestTone() {
  const ac = context();
  if (!ac) return;
  void ac.resume().catch(() => {});

  const now = ac.currentTime;
  const osc = ac.createOscillator();
  osc.type = "sine";
  osc.frequency.value = 440;

  const gain = ac.createGain();
  gain.gain.setValueAtTime(OFF, now);
  gain.gain.exponentialRampToValueAtTime(0.35, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(OFF, now + 0.6);

  osc.connect(gain).connect(ac.destination);
  osc.start(now);
  osc.stop(now + 0.7);
}

/**
 * Renders a voice twice — once raw, once through a 250Hz high-pass — and
 * returns the RMS of each. Laptop speakers roll off hard below ~200Hz, so a
 * voice whose energy is nearly all sub is one that measures fine and is
 * inaudible in practice. The ratio between the two numbers says which it is.
 */
export async function analyseVoice(
  voice: KineticVoice,
  duration: number,
  base = 146,
): Promise<{ rms: number; audible: number }> {
  const render = async (highpass: boolean) => {
    const offline = new OfflineAudioContext(1, Math.ceil(44100 * (duration + 0.3)), 44100);
    const { play, level } = VOICES[voice];
    const master = offline.createGain();
    master.gain.value = level;

    if (highpass) {
      const filter = offline.createBiquadFilter();
      filter.type = "highpass";
      filter.frequency.value = 250;
      master.connect(filter).connect(offline.destination);
    } else {
      master.connect(offline.destination);
    }

    play(offline as unknown as AudioContext, master, duration, base);
    const data = (await offline.startRendering()).getChannelData(0);
    let sum = 0;
    for (let i = 0; i < data.length; i += 1) sum += data[i] * data[i];
    return Math.sqrt(sum / data.length);
  };

  return { rms: await render(false), audible: await render(true) };
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

  // If the context is still locked, its clock is frozen: scheduling now would
  // lay the whole envelope down at time zero and it would be over before audio
  // ever starts flowing. Wait for the resume, then schedule against a clock
  // that is actually moving.
  if (ac.state === "running") {
    play(ac, master, duration, base);
  } else {
    void ac
      .resume()
      .then(() => play(ac, master, duration, base))
      .catch(() => {});
  }

  const id = window.setInterval(() => {
    if (ac.state === "running") play(ac, master, duration, base);
  }, duration * 1000);

  return () => {
    window.clearInterval(id);
    const t = ac.currentTime;
    master.gain.cancelScheduledValues(t);
    master.gain.setValueAtTime(master.gain.value, t);
    master.gain.linearRampToValueAtTime(0, t + 0.25);
    window.setTimeout(() => master.disconnect(), 400);
  };
}
