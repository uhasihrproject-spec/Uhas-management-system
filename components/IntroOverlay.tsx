"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

export default function IntroOverlay() {
  const [visible, setVisible] = useState(true);
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timeline = [
      { delay: 100, action: () => setPhase(1) },   // Color panels start closing
      { delay: 1300, action: () => setPhase(2) },  // Panels meet, colors fade to white
      { delay: 1900, action: () => setPhase(3) },  // UHAS text + logo spin in
      { delay: 3500, action: () => setPhase(4) },  // Smooth transition to "Welcome"
      { delay: 4300, action: () => setPhase(5) },  // Welcome blinks
      { delay: 5900, action: () => setPhase(6) },  // Morph out
      { delay: 6700, action: () => setVisible(false) }, // Complete
    ];

    const timeouts = timeline.map(({ delay, action }) =>
      setTimeout(action, delay)
    );

    return () => timeouts.forEach(clearTimeout);
  }, []);

  if (!visible) return null;

  return (
    <>
      <style jsx>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }

        @keyframes spin-reveal {
          0% { 
            transform: rotate(0deg) scale(0); 
            opacity: 0; 
          }
          60% { 
            transform: rotate(180deg) scale(1.05); 
            opacity: 1; 
          }
          100% { 
            transform: rotate(360deg) scale(1); 
            opacity: 1; 
          }
        }

        @keyframes fade-scale-in {
          0% { 
            transform: scale(0.9); 
            opacity: 0; 
          }
          100% { 
            transform: scale(1); 
            opacity: 1; 
          }
        }

        @keyframes morph-out {
          0% { 
            transform: scale(1) rotate(0deg);
            opacity: 1;
            filter: blur(0px);
          }
          100% { 
            transform: scale(1.3) rotate(45deg);
            opacity: 0;
            filter: blur(15px);
          }
        }

        @keyframes grain-animate {
          0%, 100% { transform: translate(0, 0); }
          10% { transform: translate(-5%, -5%); }
          20% { transform: translate(-10%, 5%); }
          30% { transform: translate(5%, -10%); }
          40% { transform: translate(-5%, 15%); }
          50% { transform: translate(-10%, 5%); }
          60% { transform: translate(15%, 0); }
          70% { transform: translate(0, 10%); }
          80% { transform: translate(-15%, 0); }
          90% { transform: translate(10%, 5%); }
        }

        .grain {
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulance type='fractalNoise' baseFrequency='3' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
          opacity: 0.015;
          animation: grain-animate 8s steps(10) infinite;
        }
      `}</style>

      <div className="fixed inset-0 z-50 overflow-hidden bg-white">
        {/* Subtle animated grain */}
        <div className="absolute inset-0 grain pointer-events-none" />

        {/* Left panel - emerald, slides from left */}
        <div
          className={`absolute inset-y-0 left-0 transition-all duration-1100 ease-in-out ${
            phase >= 1 ? "w-1/2" : "w-0"
          }`}
        >
          <div 
            className={`w-full h-full bg-linear-to-r from-emerald-100/50 via-emerald-50/30 to-transparent transition-opacity duration-600 ${
              phase >= 2 ? "opacity-0" : "opacity-100"
            }`}
          />
        </div>

        {/* Right panel - amber, slides from right */}
        <div
          className={`absolute inset-y-0 right-0 transition-all duration-1100 ease-in-out ${
            phase >= 1 ? "w-1/2" : "w-0"
          }`}
        >
          <div 
            className={`w-full h-full bg-linear-to-l from-amber-100/50 via-amber-50/30 to-transparent transition-opacity duration-600 ${
              phase >= 2 ? "opacity-0" : "opacity-100"
            }`}
          />
        </div>

        {/* Center line effect where panels meet */}
        <div
          className={`absolute inset-y-0 left-1/2 -translate-x-1/2 w-px transition-opacity duration-400 ${
            phase >= 1 && phase < 2 ? "opacity-15" : "opacity-0"
          }`}
        >
          <div className="w-full h-full bg-linear-to-b from-transparent via-neutral-300 to-transparent" />
        </div>

        {/* Center content container */}
        <div className="absolute inset-0 flex items-center justify-center">
          
          {/* FIRST VIEW: UHAS Procurement + Logo */}
          <div
            className={`absolute transition-all duration-700 ${
              phase >= 3 && phase < 4
                ? "opacity-100 scale-100"
                : phase >= 4
                ? "opacity-0 scale-95"
                : "opacity-0 scale-110"
            }`}
            style={{
              animation: phase >= 3 && phase < 4 ? "spin-reveal 1s cubic-bezier(0.34, 1.56, 0.64, 1) forwards" : "none",
            }}
          >
            <div className="flex flex-col items-center gap-5">
              {/* Logo */}
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl bg-white border border-neutral-200 flex items-center justify-center shadow-sm overflow-hidden p-2">
                  <Image 
                    src="/logo/Uhas.png" 
                    alt="UHAS Logo" 
                    width={80} 
                    height={80} 
                    className="object-contain w-full h-full"
                    priority
                  />
                </div>
              </div>

              {/* UHAS Text */}
              <div className="text-center">
                <h1 className="text-3xl sm:text-4xl font-bold text-neutral-800 tracking-tight">
                  UHAS Procurement
                </h1>
                <p className="mt-2 text-sm text-neutral-600 tracking-wide">
                  Records Registry System
                </p>
              </div>
            </div>
          </div>

          {/* SECOND VIEW: Welcome (no logo) */}
          <div
            className={`absolute transition-all duration-800 ${
              phase >= 4 && phase < 6
                ? "opacity-100 scale-100"
                : "opacity-0 scale-90"
            }`}
            style={{
              animation: phase >= 4 && phase < 5 ? "fade-scale-in 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) forwards" :
                         phase >= 6 ? "morph-out 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards" : "none",
            }}
          >
            <div
              className="text-center"
              style={{
                animation: phase >= 5 && phase < 6 ? "blink 1s ease-in-out 2" : "none",
              }}
            >
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold text-neutral-800 tracking-tight">
                Welcome
              </h1>
            </div>
          </div>
        </div>

        {/* Morph overlay - creates seamless transition */}
        <div
          className={`absolute inset-0 bg-white transition-opacity duration-800 ${
            phase >= 6 ? "opacity-100" : "opacity-0"
          }`}
        />
      </div>
    </>
  );
}