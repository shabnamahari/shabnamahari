import type { Metadata } from "next";

import { LiquidMetalButton } from "@/components/ui/liquid-metal-button";

export const metadata: Metadata = {
  title: "Liquid metal — preview",
  robots: { index: false, follow: false },
};

/**
 * A place to look at the liquid-metal button before deciding anything.
 *
 * Nothing on the live site is touched by this page existing. It sits beside
 * `/preview/motion`, which is here for the same reason: a thing you are asked
 * to judge should be shown next to the thing it would replace, at the size it
 * would actually be, rather than described.
 *
 * So each row below is one of Shabnam's real controls, at its real measurements,
 * with the metal version beside it — the sign-up bar at 42px on its clamped
 * width, the Google bar at 52, "send code" at its own width. The last row is
 * the original as it arrived: 142×46, a full pill, black with grey type.
 */
export default function LiquidMetalPreview() {
  return (
    <section className="px-[15px] py-[120px]">
      <div className="mx-auto flex w-full max-w-[46rem] flex-col gap-y-16">
        <div>
          <h1 className="text-h2">Liquid metal</h1>
          <p className="text-note text-muted-ink mt-4 max-w-[34rem]">
            Each row is one of your controls at its real size, with the metal
            version of it beside. Hover them — the metal runs faster under the
            pointer, and faster still on the press.
          </p>
        </div>

        <Row
          title="The sign-up bar"
          note="42px tall, on the same clamped width. Your green as the metal."
        >
          <LiquidMetalButton
            label="Sign in, or create an account"
            width="clamp(20rem,34vw,40rem)"
            height={42}
            radius={14}
            tint="#3f6b54"
            back="#12261c"
            labelColor="#ffffff"
          />
        </Row>

        <Row
          title="The Google bar"
          note="52px, the taller of the two, at the same corner as your panels."
        >
          <LiquidMetalButton
            label="continue with"
            width="clamp(20rem,34vw,40rem)"
            height={52}
            radius={14}
            tint="#3f6b54"
            back="#12261c"
            labelColor="#ffffff"
          />
        </Row>

        <Row title="send code" note="Small, and the roundest thing you have.">
          <LiquidMetalButton
            label="send code"
            width={132}
            height={34}
            radius={100}
            tint="#3f6b54"
            back="#12261c"
            labelColor="#ffffff"
          />
        </Row>

        <Row
          title="As it arrived"
          note="142×46, a full pill, black with grey type — the version in the instructions, unchanged."
        >
          <LiquidMetalButton label="Get Started" />
        </Row>
      </div>
    </section>
  );
}

function Row({
  title,
  note,
  children,
}: {
  title: string;
  note: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-y-5">
      <div>
        <h2 className="text-h3">{title}</h2>
        <p className="text-note text-muted-ink mt-2">{note}</p>
      </div>
      {children}
    </div>
  );
}
