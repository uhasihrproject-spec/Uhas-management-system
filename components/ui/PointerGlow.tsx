"use client";

import { useEffect, useState } from "react";

export default function PointerGlow() {
  const [pos, setPos] = useState({ x: -300, y: -300 });

  useEffect(() => {
    // Desktop-only behavior (still rendered, but hidden by CSS on small screens)
    function onMove(e: MouseEvent) {
      setPos({ x: e.clientX, y: e.clientY });
    }
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-0 hidden md:block" aria-hidden="true">
      <div
        className="absolute h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full
                   bg-emerald-200/12 blur-3xl transition-transform duration-150 ease-out"
        style={{ left: pos.x, top: pos.y }}
      />
    </div>
  );
}
