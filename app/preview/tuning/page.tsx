"use client";

import { useEffect, useRef, useState } from "react";
import KineticTypeTile from "@/components/KineticTypeTile";
import {
  analyseVoice,
  audioState,
  playTestTone,
  renderVoicePeak,
  startKineticSound,
  type KineticVoice,
} from "@/lib/kineticAudio";

/**
 * Temporary bench for picking the loop speed and the sound. Delete once both are
 * decided. Client-side because the voices are synthesised in the browser — there
 * is no audio file to link to.
 */

// Each move is 21.5% of the loop, so the per-move time is what actually changes.
const SPEEDS = [
  { total: 6.34, label: "الان" },
  { total: 5.4, label: "۱۵٪ تندتر" },
  { total: 4.8, label: "۲۵٪ تندتر" },
  { total: 4.2, label: "۳۳٪ تندتر" },
];

const VOICES: { id: KineticVoice; title: string; note: string }[] = [
  {
    id: "bowed",
    title: "زهی آرشه‌ای",
    note: "صدای انتخاب‌شده. حالا دو برابر بلندتر از قبل.",
  },
];

export default function TuningPreview() {
  const [speed, setSpeed] = useState(6.34);
  const [playing, setPlaying] = useState<KineticVoice | null>(null);
  const [engine, setEngine] = useState("—");
  const stop = useRef<(() => void) | null>(null);

  useEffect(() => () => stop.current?.(), []);

  // Debug hook for this throwaway page: lets the synthesis be measured without
  // speakers, so a silent tile can be blamed on the right thing.
  useEffect(() => {
    (window as unknown as Record<string, unknown>).__kineticAudio = {
      analyseVoice,
      renderVoicePeak,
      startKineticSound,
    };
  }, []);

  const toggle = (voice: KineticVoice) => {
    stop.current?.();
    stop.current = null;
    if (playing === voice) {
      setPlaying(null);
      return;
    }
    stop.current = startKineticSound(speed, 146, voice);
    setPlaying(voice);
    setEngine(audioState());
  };

  return (
    <main className="page-margin flex min-h-screen flex-col gap-y-16 py-24">
      <div className="flex flex-col gap-y-3">
        <h1 className="text-h3">Design 5 — speed and sound</h1>
        <p className="text-body max-w-[62ch] text-muted-ink">
          Click a speed to see design 5 at that tempo, and a sound to hear it on
          the same clock. Sound needs one click anywhere first — browsers block
          audio until then, so the first button press also unlocks it.
        </p>
      </div>

      <section className="flex flex-col gap-y-6">
        <h2 className="text-note">Speed</h2>
        <div className="flex flex-wrap gap-3">
          {SPEEDS.map(({ total, label }) => (
            <button
              key={total}
              type="button"
              onClick={() => setSpeed(total)}
              className={`text-body border px-4 py-2 ${
                speed === total
                  ? "border-ink bg-ink text-cream"
                  : "border-rule text-ink"
              }`}
            >
              {label} — {total}s ({(total * 0.215).toFixed(2)}s per move)
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-start gap-8">
          {[
            { lines: ["IELTS"], size: "23cqmin" },
            { lines: ["Blog", "Casts"], size: "18cqmin" },
            { lines: ["Business", "English"], size: "12.5cqmin" },
          ].map(({ lines, size }) => (
            <span
              key={lines.join("")}
              className="relative block aspect-square w-[260px] overflow-hidden bg-media-gray"
            >
              <KineticTypeTile
                key={`${lines.join("")}-${speed}`}
                lines={lines}
                size={size}
                duration={speed}
                sound={false}
              />
            </span>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-y-6">
        <h2 className="text-note">تست صدا</h2>
        <div className="flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={() => {
              playTestTone();
              setTimeout(() => setEngine(audioState()), 120);
            }}
            className="text-body border border-ink bg-ink px-5 py-3 text-cream"
          >
            ♪ بوقِ تست — باید یک صدای واضح بشنوی
          </button>
          <span className="text-body text-muted-ink">
            وضعیت موتور صدای مرورگر: <b className="text-ink">{engine}</b>
          </span>
          <button
            type="button"
            onClick={() => setEngine(audioState())}
            className="text-body border border-rule px-4 py-2"
          >
            به‌روزرسانی وضعیت
          </button>
        </div>
        <p className="text-body max-w-[64ch] text-muted-ink">
          اگر بوق را شنیدی ولی صدای کاشی‌ها را نه، مشکل بلندی صداست. اگر بوق را
          هم نشنیدی و وضعیت «running» بود، صدا از خودِ سیستم یا تب مرورگر بسته
          است. اگر وضعیت «suspended» ماند، مرورگر اجازه نمی‌دهد.
        </p>

        <h2 className="text-note pt-6">Sound</h2>
        <div className="flex flex-col gap-4">
          {VOICES.map(({ id, title, note }) => (
            <div key={id} className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => toggle(id)}
                className={`text-body w-[230px] border px-4 py-3 text-left ${
                  playing === id
                    ? "border-ink bg-ink text-cream"
                    : "border-rule text-ink"
                }`}
              >
                {playing === id ? "■ توقف" : "▶ پخش"} · {title}
              </button>
              <span className="text-body text-muted-ink">{note}</span>
            </div>
          ))}
        </div>

      </section>
    </main>
  );
}
