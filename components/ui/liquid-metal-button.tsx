"use client";

import { useEffect, useRef, useState } from "react";
import {
  ShaderMount,
  liquidMetalFragmentShader,
  getShaderColorFromString,
} from "@paper-design/shaders";

/**
 * The liquid-metal button, adapted from the version Shabnam sent.
 *
 * `components/ui/` because that is where the instructions put it. This is not a
 * shadcn project — there is no `components.json`, no `cn()` and no registry —
 * and the component needs none of that: it imports nothing from shadcn and none
 * of `clsx`, `tailwind-merge` or `lucide-react`, so only the shader package was
 * installed. The folder is kept anyway so a second component from the same
 * source lands beside this one rather than somewhere new.
 *
 * Three things changed from the pasted version, all because it was written as a
 * standalone showpiece and this has to sit among Shabnam's own controls.
 *
 * Size is a prop. The original is hard-coded to 142×46 with a 100px radius, and
 * not one control on this site is that: the sign-up bar is 42px tall on a
 * clamped width, the Google bar is full width at 52, "send code" is as wide as
 * its own text. A fixed pill could only ever have been shown next to them, not
 * used as them.
 *
 * Colour is a prop too, and this is the part worth knowing: the shader has real
 * `u_colorBack` and `u_colorTint` uniforms, so the metal can be *made* of a
 * given colour rather than filtered towards one afterwards. Shabnam's
 * requirement — the effect in the button's own colour — is therefore something
 * the shader supports properly rather than something to fake with a hue
 * rotation.
 *
 * The icon mode is gone. It needed `lucide-react` for one sparkle, and every
 * control on this site is a word.
 */

export interface LiquidMetalButtonProps {
  label?: string;
  onClick?: () => void;
  width?: number | string;
  height?: number;
  radius?: number;
  /** The metal's own colour. Any CSS colour; the shader is built from it. */
  tint?: string;
  /** What sits behind the metal, showing through where the tint thins. */
  back?: string;
  /** The label's colour. Separate, because it sits above the metal, not in it. */
  labelColor?: string;
}

export function LiquidMetalButton({
  label = "Get Started",
  onClick,
  width = 142,
  height = 46,
  radius = 100,
  tint = "#c8c8c8",
  back = "#000000",
  labelColor = "#666666",
}: LiquidMetalButtonProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [ripples, setRipples] = useState<{ x: number; y: number; id: number }[]>([]);

  const shaderRef = useRef<HTMLDivElement>(null);
  const shaderMount = useRef<ShaderMount | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const rippleId = useRef(0);

  /*
   * The keyframes for the click ripple, injected once.
   *
   * Kept from the original rather than moved into globals.css deliberately:
   * this is a sample, and everything it needs should leave with it if Shabnam
   * decides against it. The canvas sizing rules the original also injected are
   * gone — they forced a 100px radius on every canvas on the page, which would
   * have rounded the assistant's panels too.
   */
  useEffect(() => {
    const id = "liquid-metal-ripple";
    if (document.getElementById(id)) return;
    const style = document.createElement("style");
    style.id = id;
    style.textContent = `
      @keyframes liquid-metal-ripple {
        0%   { transform: translate(-50%, -50%) scale(0); opacity: 0.55; }
        100% { transform: translate(-50%, -50%) scale(4); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }, []);

  useEffect(() => {
    if (!shaderRef.current) return;

    const mount = new ShaderMount(
      shaderRef.current,
      liquidMetalFragmentShader,
      {
        u_colorBack: getShaderColorFromString(back),
        u_colorTint: getShaderColorFromString(tint),
        u_repetition: 4,
        u_softness: 0.5,
        u_shiftRed: 0.3,
        u_shiftBlue: 0.3,
        u_distortion: 0,
        u_contour: 0,
        u_angle: 45,
        u_scale: 8,
        u_shape: 1,
        u_offsetX: 0.1,
        u_offsetY: -0.1,
      },
      undefined,
      0.6,
    );
    shaderMount.current = mount;

    return () => {
      mount.dispose?.();
      shaderMount.current = null;
    };
  }, [tint, back]);

  /** The metal runs faster under the pointer and faster still on the press. */
  function speed(value: number) {
    shaderMount.current?.setSpeed?.(value);
  }

  const cssWidth = typeof width === "number" ? `${width}px` : width;

  return (
    <div style={{ perspective: "1000px", perspectiveOrigin: "50% 50%" }}>
      <div
        style={{
          position: "relative",
          width: cssWidth,
          height,
          transformStyle: "preserve-3d",
        }}
      >
        {/* The label, floating above the metal. */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transform: "translateZ(20px)",
            zIndex: 30,
            pointerEvents: "none",
          }}
        >
          <span
            style={{
              fontSize: "0.9375rem",
              color: labelColor,
              textShadow: "0px 1px 2px rgba(0, 0, 0, 0.45)",
              whiteSpace: "nowrap",
            }}
          >
            {label}
          </span>
        </div>

        {/* The ground the metal is poured onto. */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            transform: `translateZ(10px) ${isPressed ? "translateY(1px) scale(0.985)" : ""}`,
            transition: "transform 0.15s cubic-bezier(0.4, 0, 0.2, 1)",
            zIndex: 20,
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 2,
              borderRadius: radius,
              background: back,
              boxShadow: isPressed
                ? "inset 0px 2px 4px rgba(0,0,0,0.4), inset 0px 1px 2px rgba(0,0,0,0.3)"
                : "none",
              transition: "box-shadow 0.15s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          />
        </div>

        {/* The metal itself. */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: radius,
            overflow: "hidden",
            transform: `translateZ(0px) ${isPressed ? "translateY(1px) scale(0.985)" : ""}`,
            transition: "transform 0.15s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.15s",
            boxShadow: isPressed
              ? "0 0 0 1px rgba(0,0,0,0.5), 0 1px 2px rgba(0,0,0,0.3)"
              : isHovered
                ? "0 0 0 1px rgba(0,0,0,0.4), 0 8px 5px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.18)"
                : "0 0 0 1px rgba(0,0,0,0.3), 0 9px 9px rgba(0,0,0,0.10), 0 2px 5px rgba(0,0,0,0.15)",
            zIndex: 10,
          }}
        >
          <div ref={shaderRef} style={{ width: "100%", height: "100%" }} />
        </div>

        <button
          ref={buttonRef}
          type="button"
          aria-label={label}
          onClick={(e) => {
            speed(2.4);
            setTimeout(() => speed(isHovered ? 1 : 0.6), 300);
            const rect = buttonRef.current?.getBoundingClientRect();
            if (rect) {
              const ripple = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
                id: rippleId.current++,
              };
              setRipples((prev) => [...prev, ripple]);
              setTimeout(
                () => setRipples((prev) => prev.filter((r) => r.id !== ripple.id)),
                600,
              );
            }
            onClick?.();
          }}
          onMouseEnter={() => {
            setIsHovered(true);
            speed(1);
          }}
          onMouseLeave={() => {
            setIsHovered(false);
            setIsPressed(false);
            speed(0.6);
          }}
          onMouseDown={() => setIsPressed(true)}
          onMouseUp={() => setIsPressed(false)}
          style={{
            position: "absolute",
            inset: 0,
            background: "transparent",
            border: "none",
            outline: "none",
            borderRadius: radius,
            overflow: "hidden",
            transform: "translateZ(25px)",
            zIndex: 40,
          }}
        >
          {ripples.map((r) => (
            <span
              key={r.id}
              style={{
                position: "absolute",
                left: r.x,
                top: r.y,
                width: 20,
                height: 20,
                borderRadius: "50%",
                background:
                  "radial-gradient(circle, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0) 70%)",
                pointerEvents: "none",
                animation: "liquid-metal-ripple 0.6s ease-out",
              }}
            />
          ))}
        </button>
      </div>
    </div>
  );
}
