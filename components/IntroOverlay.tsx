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

function useTypewriter(text: string, active: boolean, speedMs = 50) {
  const [out, setOut] = useState("");
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    if (!active) {
      setOut("");
      setShowCursor(true);
      return;
    }

    setOut("");
    setShowCursor(true);

    let i = 0;
    const typeInterval = window.setInterval(() => {
      i += 1;
      setOut(text.slice(0, i));
      
      if (i >= text.length) {
        window.clearInterval(typeInterval);
        window.setTimeout(() => setShowCursor(false), 800);
      }
    }, speedMs);

    return () => window.clearInterval(typeInterval);
  }, [text, active, speedMs]);

  return { text: out, showCursor };
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

  const { text: typedName, showCursor } = useTypewriter(
    welcome.name, 
    phase >= 4 && phase < 6, 
    75
  );

  // Skip function
  const handleSkip = () => {
    document.documentElement.dataset.intro = "done";
    setClosing(true);
    window.setTimeout(() => setVisible(false), 650);
  };

  // global handoff marker
  useEffect(() => {
    document.documentElement.dataset.intro = "playing";
    return () => {
      document.documentElement.dataset.intro = "done";
    };
  }, []);

  // timeline phases
  useEffect(() => {
    const timeline = [
      { delay: 100, action: () => setPhase(1) },
      { delay: 1400, action: () => setPhase(2) },
      { delay: 2000, action: () => setPhase(3) },
      { delay: 3600, action: () => setPhase(4) },
      { delay: 4400, action: () => setPhase(5) },
      { delay: 6200, action: () => setPhase(6) },
      { delay: 6500, action: () => setClosing(true) },
      { delay: 7200, action: () => setVisible(false) },
    ];
    const timeouts = timeline.map(({ delay, action }) =>
      window.setTimeout(action, delay)
    );
    return () => timeouts.forEach(clearTimeout);
  }, []);

  // when closing starts
  useEffect(() => {
    if (!closing) return;
    document.documentElement.dataset.intro = "done";
  }, [closing]);

  // ESC skip
  useEffect(() => {
    if (!visible) return;
    
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleSkip();
    };
    
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible]);

  // pointer-follow effects
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    const reduced =
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
    if (reduced) return;

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
        if (!node) return;

        const r = node.getBoundingClientRect();
        if (!r.width || !r.height) return;

        const px = (clientX - r.left) / r.width;
        const py = (clientY - r.top) / r.height;

        const sx = Math.max(0, Math.min(100, px * 100));
        const sy = Math.max(0, Math.min(100, py * 100));

        node.style.setProperty("--sx", `${sx}%`);
        node.style.setProperty("--sy", `${sy}%`);
        node.style.setProperty("--cx", `${sx}%`);
        node.style.setProperty("--cy", `${sy}%`);

        const ry = (px - 0.5) * 3;
        const rx = (0.5 - py) * 3;
        node.style.setProperty("--rx", `${rx.toFixed(2)}deg`);
        node.style.setProperty("--ry", `${ry.toFixed(2)}deg`);
      });
    };

    const onMove = (e: PointerEvent) => update(e.clientX, e.clientY);

    el.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      el.removeEventListener("pointermove", onMove as any);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <>
      <style jsx>{`
        @keyframes blink-cursor {
          0%, 49% { opacity: 1; }
          50%, 100% { opacity: 0; }
        }

        @keyframes blink-text {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        @keyframes brand-float-in {
          0% {
            transform: translateY(20px);
            opacity: 0;
            filter: blur(8px);
          }
          60% {
            transform: translateY(-4px);
            opacity: 1;
            filter: blur(0px);
          }
          100% {
            transform: translateY(0);
            opacity: 1;
            filter: blur(0px);
          }
        }

        @keyframes welcome-float-in {
          0% {
            transform: translateY(16px);
            opacity: 0;
            filter: blur(6px);
          }
          100% {
            transform: translateY(0);
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
            transform: scale(1.06);
            opacity: 0;
            filter: blur(12px);
          }
        }

        @keyframes grain-subtle {
          0%, 100% { transform: translate(0, 0); }
          25% { transform: translate(-2%, -1%); }
          50% { transform: translate(-3%, 1%); }
          75% { transform: translate(2%, -2%); }
        }

        @keyframes shine-sweep {
          0% {
            transform: translateX(-100%) skewX(-15deg);
            opacity: 0;
          }
          20% {
            opacity: 0.5;
          }
          100% {
            transform: translateX(200%) skewX(-15deg);
            opacity: 0;
          }
        }

        @keyframes underline-draw {
          0% {
            transform: scaleX(0);
            opacity: 0;
          }
          50% {
            opacity: 1;
          }
          100% {
            transform: scaleX(1);
            opacity: 1;
          }
        }

        @keyframes float-gentle {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-3px); }
        }

        @keyframes pulse-glow {
          0%, 100% { 
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
          }
          50% { 
            box-shadow: 0 8px 24px rgba(16, 185, 129, 0.12);
          }
        }

        @keyframes fade-in-up {
          0% {
            opacity: 0;
            transform: translateY(10px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .grain {
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='3' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
          opacity: 0.01;
          animation: grain-subtle 12s ease-in-out infinite;
        }

        .spotlight {
          background: radial-gradient(
            min(80vw, 700px) min(60vh, 500px) at var(--sx, 50%) var(--sy, 42%),
            rgba(16, 185, 129, 0.05),
            rgba(245, 158, 11, 0.03),
            rgba(255, 255, 255, 0) 70%
          );
        }

        .seamGlow {
          background: linear-gradient(to bottom, transparent, rgba(0, 0, 0, 0.06), transparent);
          opacity: 0.2;
        }

        .panel-sheen-left {
          background: radial-gradient(
            min(70vw, 600px) min(50vh, 400px) at var(--cx, 50%) var(--cy, 50%),
            rgba(255, 255, 255, 0.25),
            rgba(255, 255, 255, 0) 65%
          );
        }
        
        .panel-sheen-right {
          background: radial-gradient(
            min(70vw, 600px) min(50vh, 400px) at var(--cx, 50%) var(--cy, 50%),
            rgba(255, 255, 255, 0.2),
            rgba(255, 255, 255, 0) 65%
          );
        }

        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>

      <div
        ref={rootRef}
        className={[
          "fixed inset-0 z-[9999] overflow-hidden bg-white",
          "transition-opacity duration-700 ease-out",
          closing ? "opacity-0" : "opacity-100",
        ].join(" ")}
      >
        <div className="absolute inset-0 spotlight pointer-events-none" />
        <div className="absolute inset-0 grain pointer-events-none" />

        {/* Left panel */}
        <div
          className={[
            "absolute inset-y-0 left-0",
            "transition-all duration-[1200ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
            phase >= 1 ? "w-1/2" : "w-0",
          ].join(" ")}
        >
          <div
            className={[
              "w-full h-full bg-gradient-to-r from-emerald-100/45 via-emerald-50/25 to-transparent",
              "rounded-r-[clamp(32px,10vw,80px)]",
              "transition-opacity duration-700 ease-out",
              phase >= 2 ? "opacity-0" : "opacity-100",
            ].join(" ")}
          />
          <div className="pointer-events-none absolute inset-0 panel-sheen-left rounded-r-[clamp(32px,10vw,80px)]" />
        </div>

        {/* Right panel */}
        <div
          className={[
            "absolute inset-y-0 right-0",
            "transition-all duration-[1200ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
            phase >= 1 ? "w-1/2" : "w-0",
          ].join(" ")}
        >
          <div
            className={[
              "w-full h-full bg-gradient-to-l from-amber-100/35 via-amber-50/20 to-transparent",
              "rounded-l-[clamp(32px,10vw,80px)]",
              "transition-opacity duration-700 ease-out",
              phase >= 2 ? "opacity-0" : "opacity-100",
            ].join(" ")}
          />
          <div className="pointer-events-none absolute inset-0 panel-sheen-right rounded-l-[clamp(32px,10vw,80px)]" />
        </div>

        {/* Seam */}
        <div
          className={[
            "absolute inset-y-0 left-1/2 -translate-x-1/2 w-px",
            "transition-opacity duration-500 ease-out",
            phase >= 1 && phase < 2 ? "opacity-100" : "opacity-0",
          ].join(" ")}
        >
          <div className="w-full h-full seamGlow" />
        </div>

        {/* Center content */}
        <div className="absolute inset-0 flex items-center justify-center px-4 sm:px-6">
          <div
            ref={contentRef}
            className="w-full max-w-2xl"
            style={{
              transform:
                phase >= 2 && phase < 6
                  ? `perspective(1400px) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg))`
                  : "none",
              transition: "transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          >
            {/* Brand view */}
            <div
              className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full transition-all duration-800 ease-out ${
                phase >= 3 && phase < 4
                  ? "opacity-100"
                  : phase >= 4
                  ? "opacity-0"
                  : "opacity-0"
              }`}
              style={{
                animation:
                  phase >= 3 && phase < 4
                    ? "brand-float-in 1000ms cubic-bezier(0.16, 1, 0.3, 1) forwards"
                    : "none",
              }}
            >
              <div className="flex flex-col items-center gap-5">
                <div 
                  className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white border border-neutral-200 overflow-hidden p-2.5"
                  style={{
                    animation: phase >= 3 && phase < 4 ? "float-gentle 4s ease-in-out infinite, pulse-glow 3s ease-in-out infinite" : "none",
                  }}
                >
                  <Image
                    src="/logo/Uhas.png"
                    alt="UHAS Logo"
                    width={96}
                    height={96}
                    className="object-contain w-full h-full"
                    priority
                  />
                  <div
                    className="pointer-events-none absolute inset-y-0 -left-full w-full bg-gradient-to-r from-transparent via-white/50 to-transparent"
                    style={{
                      animation:
                        phase >= 3 && phase < 4 ? "shine-sweep 1400ms ease-out 200ms forwards" : "none",
                    }}
                  />
                </div>

                <div className="text-center px-4">
                  <h1 className="text-xl sm:text-2xl font-semibold text-neutral-800 tracking-tight">
                    UHAS Procurement
                  </h1>
                  <p className="mt-2 text-sm text-neutral-600 tracking-wide">
                    Records Registry System
                  </p>
                </div>
              </div>
            </div>

            {/* Welcome view */}
            <div
              className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full transition-all duration-900 ease-out ${
                phase >= 4 && phase < 6 ? "opacity-100" : "opacity-0"
              }`}
              style={{
                animation:
                  phase >= 4 && phase < 6
                    ? "welcome-float-in 800ms cubic-bezier(0.16, 1, 0.3, 1) forwards"
                    : phase >= 6
                    ? "morph-out 900ms cubic-bezier(0.16, 1, 0.3, 1) forwards"
                    : "none",
              }}
            >
              <div
                className="text-center px-4"
                style={{
                  animation: phase >= 5 && phase < 6 ? "blink-text 1s ease-in-out 2" : "none",
                }}
              >
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-semibold text-neutral-800 tracking-tight leading-[1.15]">
                  {welcome.base}
                  {welcome.name && (
                    <>
                      {" "}
                      <span className="relative inline-flex items-baseline">
                        <span className="inline-block">{typedName}</span>
                        <span
                          className={[
                            "ml-1 inline-block w-[2px] sm:w-[3px] h-[0.85em]",
                            "bg-emerald-400 align-middle rounded-full",
                            "transition-opacity duration-200",
                            showCursor ? "opacity-100" : "opacity-0",
                          ].join(" ")}
                          style={{
                            animation: showCursor ? "blink-cursor 1s step-end infinite" : "none",
                          }}
                          aria-hidden="true"
                        />
                      </span>
                    </>
                  )}
                </h1>

                <div className="mt-4 sm:mt-5 flex justify-center">
                  <div
                    className="h-[3px] w-24 sm:w-36 bg-gradient-to-r from-emerald-200 via-emerald-300 to-amber-200 origin-left rounded-full"
                    style={{
                      animation:
                        phase >= 4 && phase < 6 ? "underline-draw 900ms cubic-bezier(0.16, 1, 0.3, 1) 100ms forwards" : "none",
                    }}
                  />
                </div>

                <p className="mt-4 text-sm sm:text-base text-neutral-600 max-w-md mx-auto">
                  Procurement Records Registry
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Skip button - centered and fixed */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-center pb-6 sm:pb-8 pointer-events-none">
          <button
            onClick={handleSkip}
            type="button"
            className={[
              "pointer-events-auto",
              "flex items-center gap-2 px-5 py-3 rounded-full",
              "bg-white/90 backdrop-blur-md border border-neutral-200 shadow-lg",
              "hover:shadow-xl hover:scale-105 active:scale-95",
              "transition-all duration-300",
              phase >= 1 && phase < 6 ? "opacity-100" : "opacity-0",
            ].join(" ")}
            style={{
              animation: phase >= 1 && phase < 6 ? "fade-in-up 600ms cubic-bezier(0.16, 1, 0.3, 1) 800ms both" : "none",
            }}
          >
            <svg className="w-4 h-4 text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
            <span className="text-sm font-medium text-neutral-700">Skip intro</span>
            <kbd className="hidden sm:inline-flex px-2 py-0.5 text-xs font-semibold text-neutral-500 bg-neutral-50 border border-neutral-200 rounded">
              ESC
            </kbd>
          </button>
        </div>

        {/* Final white blend */}
        <div
          className={`absolute inset-0 bg-white transition-opacity duration-900 ease-out pointer-events-none ${
            phase >= 6 ? "opacity-100" : "opacity-0"
          }`}
        />
      </div>
    </>
  );
}