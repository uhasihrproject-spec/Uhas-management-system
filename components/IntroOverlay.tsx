"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";

function pickFirstName(nameOrEmail: string | null) {
  const v = (nameOrEmail || "").trim();
  if (!v) return "";
  const base = v.includes("@") ? v.split("@")[0] : v;
  const token = base.replace(/[._-]+/g, " ").trim().split(/\s+/)[0] || "";
  if (!token) return "";
  return token.charAt(0).toUpperCase() + token.slice(1);
}

function useTypewriter(text: string, active: boolean, speedMs = 38) {
  const [out, setOut] = useState("");

  useEffect(() => {
    if (!active) return;
    setOut("");

    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setOut(text.slice(0, i));
      if (i >= text.length) window.clearInterval(id);
    }, Math.max(18, speedMs));

    return () => window.clearInterval(id);
  }, [text, active, speedMs]);

  return out;
}

export default function IntroOverlay({
  isAuthed,
  displayName,
}: {
  isAuthed: boolean;
  displayName: string | null;
}) {
  const [visible, setVisible] = useState(true);
  const [phase, setPhase] = useState(0);
  const [closing, setClosing] = useState(false);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);

  const welcome = useMemo(() => {
  if (!isAuthed) return { base: "Welcome", name: "" };
  const fn = pickFirstName(displayName);
  return fn ? { base: "Welcome,", name: fn } : { base: "Welcome", name: "" };
}, [isAuthed, displayName]);

const typedName = useTypewriter(welcome.name, phase >= 4 && phase < 6, 40);

  // global handoff marker for app settle animation
  useEffect(() => {
    document.documentElement.dataset.intro = "playing";
    return () => {
      document.documentElement.dataset.intro = "done";
    };
  }, []);

  // timeline phases (same logic)
  useEffect(() => {
    const timeline = [
      { delay: 100, action: () => setPhase(1) },
      { delay: 1300, action: () => setPhase(2) },
      { delay: 1900, action: () => setPhase(3) },
      { delay: 3500, action: () => setPhase(4) },
      { delay: 4300, action: () => setPhase(5) },
      { delay: 5900, action: () => setPhase(6) },
      { delay: 6200, action: () => setClosing(true) },
      { delay: 6900, action: () => setVisible(false) },
    ];
    const timeouts = timeline.map(({ delay, action }) =>
      window.setTimeout(action, delay)
    );
    return () => timeouts.forEach(clearTimeout);
  }, []);

  // when closing starts, allow app to settle in
  useEffect(() => {
    if (!closing) return;
    document.documentElement.dataset.intro = "done";
  }, [closing]);

  // ESC skip
  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        document.documentElement.dataset.intro = "done";
        setClosing(true);
        window.setTimeout(() => setVisible(false), 650);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible]);

  // pointer-follow spotlight + panel bend + subtle tilt (safe)
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    const reduced =
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
    if (reduced) return;

    // defaults
    el.style.setProperty("--sx", "50%");
    el.style.setProperty("--sy", "42%");
    el.style.setProperty("--cx", "50%");
    el.style.setProperty("--cy", "42%");
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");

    const update = (clientX: number, clientY: number) => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);

      rafRef.current = requestAnimationFrame(() => {
        const node = rootRef.current;
        const box = contentRef.current;
        if (!node || !box) return;

        const r = node.getBoundingClientRect();
        if (!r.width || !r.height) return;

        const px = (clientX - r.left) / r.width; // 0..1
        const py = (clientY - r.top) / r.height; // 0..1

        const sx = Math.max(0, Math.min(100, px * 100));
        const sy = Math.max(0, Math.min(100, py * 100));

        node.style.setProperty("--sx", `${sx}%`);
        node.style.setProperty("--sy", `${sy}%`);
        node.style.setProperty("--cx", `${sx}%`);
        node.style.setProperty("--cy", `${sy}%`);

        // tiny tilt, max ~3deg
        const ry = (px - 0.5) * 6;
        const rx = (0.5 - py) * 6;
        node.style.setProperty("--rx", `${rx.toFixed(2)}deg`);
        node.style.setProperty("--ry", `${ry.toFixed(2)}deg`);
      });
    };

    const onMove = (e: PointerEvent) => update(e.clientX, e.clientY);

    el.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      el.removeEventListener("pointermove", onMove as any);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <>
      <style jsx>{`
        @keyframes blink {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.45;
          }
        }

        @keyframes brand-in {
          0% {
            transform: translateY(10px) scale(0.98);
            opacity: 0;
            filter: blur(10px);
          }
          70% {
            transform: translateY(0) scale(1.01);
            opacity: 1;
            filter: blur(0px);
          }
          100% {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
        }

        @keyframes welcome-in {
          0% {
            transform: translateY(8px) scale(0.99);
            opacity: 0;
            filter: blur(9px);
          }
          100% {
            transform: translateY(0) scale(1);
            opacity: 1;
            filter: blur(0px);
          }
        }

        @keyframes morph-out {
          0% {
            transform: scale(1);
            opacity: 1;
            filter: blur(0px);
          }
          100% {
            transform: scale(1.1);
            opacity: 0;
            filter: blur(14px);
          }
        }

        @keyframes grain-animate {
          0%,
          100% {
            transform: translate(0, 0);
          }
          10% {
            transform: translate(-3%, -2%);
          }
          20% {
            transform: translate(-6%, 2%);
          }
          30% {
            transform: translate(3%, -6%);
          }
          40% {
            transform: translate(-2%, 8%);
          }
          50% {
            transform: translate(-6%, 2%);
          }
          60% {
            transform: translate(8%, 0);
          }
          70% {
            transform: translate(0, 6%);
          }
          80% {
            transform: translate(-8%, 0);
          }
          90% {
            transform: translate(6%, 2%);
          }
        }

        @keyframes shine {
          0% {
            transform: translateX(-140%) rotate(18deg);
            opacity: 0;
          }
          20% {
            opacity: 0.32;
          }
          100% {
            transform: translateX(140%) rotate(18deg);
            opacity: 0;
          }
        }

        @keyframes underline {
          0% {
            transform: scaleX(0);
            opacity: 0;
          }
          40% {
            opacity: 1;
          }
          100% {
            transform: scaleX(1);
            opacity: 1;
          }
        }

        .grain {
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulance type='fractalNoise' baseFrequency='3' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
          opacity: 0.014;
          animation: grain-animate 9s steps(10) infinite;
        }

        .spotlight {
          background: radial-gradient(
            640px 470px at var(--sx, 50%) var(--sy, 42%),
            rgba(16, 185, 129, 0.08),
            rgba(245, 158, 11, 0.06),
            rgba(255, 255, 255, 0) 62%
          );
        }

        .seamGlow {
          background: linear-gradient(
            to bottom,
            transparent,
            rgba(0, 0, 0, 0.1),
            transparent
          );
          opacity: 0.12;
        }

        /* panel bend follows pointer */
        .panel-bend-left {
          clip-path: ellipse(120% 85% at calc(var(--cx, 50%) + 30%) var(--cy, 50%));
        }
        .panel-bend-right {
          clip-path: ellipse(120% 85% at calc(var(--cx, 50%) - 30%) var(--cy, 50%));
        }

        .panel-sheen-left {
          background: radial-gradient(
            520px 360px at var(--cx, 50%) var(--cy, 50%),
            rgba(255, 255, 255, 0.34),
            rgba(255, 255, 255, 0) 55%
          );
          opacity: 0.32;
        }
        .panel-sheen-right {
          background: radial-gradient(
            520px 360px at var(--cx, 50%) var(--cy, 50%),
            rgba(255, 255, 255, 0.26),
            rgba(255, 255, 255, 0) 55%
          );
          opacity: 0.28;
        }

        @media (prefers-reduced-motion: reduce) {
          .grain {
            animation: none !important;
          }
          .panel-bend-left,
          .panel-bend-right {
            clip-path: none !important;
          }
        }
      `}</style>

      <div
        ref={rootRef}
        className={[
          "fixed inset-0 z-50 overflow-hidden bg-white",
          "transition-opacity duration-700 ease-out",
          closing ? "opacity-0" : "opacity-100",
        ].join(" ")}
      >
        <div className="absolute inset-0 spotlight pointer-events-none" />
        <div className="absolute inset-0 grain pointer-events-none" />

        {/* Left panel */}
        <div
          className={[
            "absolute inset-y-0 left-0 transition-[width] duration-[1100ms] ease-[cubic-bezier(.2,.9,.2,1)]",
            phase >= 1 ? "w-1/2" : "w-0",
          ].join(" ")}
        >
          <div
            className={[
              "w-full h-full bg-gradient-to-r from-emerald-100/55 via-emerald-50/35 to-transparent rounded-r-[56px]",
              "transition-opacity duration-600",
              phase >= 2 ? "opacity-0" : "opacity-100",
              "panel-bend-left",
            ].join(" ")}
          />
          <div className="pointer-events-none absolute inset-0 panel-sheen-left rounded-r-[56px]" />
        </div>

        {/* Right panel */}
        <div
          className={[
            "absolute inset-y-0 right-0 transition-[width] duration-[1100ms] ease-[cubic-bezier(.2,.9,.2,1)]",
            phase >= 1 ? "w-1/2" : "w-0",
          ].join(" ")}
        >
          <div
            className={[
              "w-full h-full bg-gradient-to-l from-amber-100/45 via-amber-50/30 to-transparent rounded-l-[56px]",
              "transition-opacity duration-600",
              phase >= 2 ? "opacity-0" : "opacity-100",
              "panel-bend-right",
            ].join(" ")}
          />
          <div className="pointer-events-none absolute inset-0 panel-sheen-right rounded-l-[56px]" />
        </div>

        {/* Seam */}
        <div
          className={[
            "absolute inset-y-0 left-1/2 -translate-x-1/2 w-px transition-opacity duration-400",
            phase >= 1 && phase < 2 ? "opacity-100" : "opacity-0",
          ].join(" ")}
        >
          <div className="w-full h-full seamGlow" />
        </div>

        {/* Center content */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            ref={contentRef}
            style={{
              transform:
                phase >= 2 && phase < 6
                  ? `perspective(900px) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg))`
                  : "none",
              transition: "transform 180ms ease-out",
            }}
          >
            {/* Brand view */}
            <div
              className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transition-all duration-700 ${
                phase >= 3 && phase < 4
                  ? "opacity-100 scale-100"
                  : phase >= 4
                  ? "opacity-0 scale-95"
                  : "opacity-0 scale-110"
              }`}
              style={{
                animation:
                  phase >= 3 && phase < 4
                    ? "brand-in 900ms cubic-bezier(.2,.9,.2,1) both"
                    : "none",
              }}
            >
              <div className="flex flex-col items-center gap-4">
                <div className="relative w-[72px] h-[72px] rounded-2xl bg-white border border-neutral-200 shadow-sm overflow-hidden p-2">
                  <Image
                    src="/logo/Uhas.png"
                    alt="UHAS Logo"
                    width={72}
                    height={72}
                    className="object-contain w-full h-full"
                    priority
                  />
                  <div
                    className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 bg-gradient-to-r from-transparent via-white/55 to-transparent"
                    style={{
                      animation:
                        phase >= 3 && phase < 4 ? "shine 1100ms ease-out 140ms both" : "none",
                      opacity: phase >= 3 && phase < 4 ? 1 : 0,
                    }}
                  />
                </div>

                <div className="text-center">
                  <h1 className="text-xl sm:text-2xl font-semibold text-neutral-800 tracking-tight">
                    UHAS Procurement
                  </h1>
                  <p className="mt-1 text-xs sm:text-sm text-neutral-600 tracking-wide">
                    Records Registry System
                  </p>
                </div>
              </div>
            </div>

            {/* Welcome view */}
            <div
              className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transition-all duration-800 ${
                phase >= 4 && phase < 6 ? "opacity-100 scale-100" : "opacity-0 scale-95"
              }`}
              style={{
                animation:
                  phase >= 4 && phase < 6
                    ? "welcome-in 700ms cubic-bezier(.2,.9,.2,1) both"
                    : phase >= 6
                    ? "morph-out 800ms cubic-bezier(.2,.9,.2,1) both"
                    : "none",
              }}
            >
              <div
                className="text-center"
                style={{
                  animation: phase >= 5 && phase < 6 ? "blink 0.9s ease-in-out 2" : "none",
                }}
              >
                <h1 className="text-2xl sm:text-4xl md:text-5xl font-semibold text-neutral-800 tracking-tight">
                {welcome.base}{" "}
                {welcome.name ? (
                    <span className="relative inline-flex items-baseline">
                    <span>{typedName}</span>
                    {/* tiny caret, stops after finished */}
                    <span
                        className={[
                        "ml-0.5 inline-block w-[2px] h-[0.9em] bg-neutral-300 align-middle",
                        typedName.length < welcome.name.length ? "opacity-100" : "opacity-0",
                        ].join(" ")}
                        style={{
                        animation:
                            typedName.length < welcome.name.length
                            ? "blink 0.85s ease-in-out infinite"
                            : "none",
                        }}
                        aria-hidden="true"
                    />
                    </span>
                ) : null}
                </h1>

                <div className="mt-2 flex justify-center">
                  <div
                    className="h-[2px] w-28 sm:w-36 bg-neutral-200 origin-left"
                    style={{
                      animation:
                        phase >= 4 && phase < 6 ? "underline 700ms ease-out 120ms both" : "none",
                    }}
                  />
                </div>

                <p className="mt-3 text-xs sm:text-sm text-neutral-600">
                  Procurement Records Registry
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* White blend out */}
        <div
          className={`absolute inset-0 bg-white transition-opacity duration-800 ${
            phase >= 6 ? "opacity-100" : "opacity-0"
          }`}
        />
      </div>
    </>
  );
}
