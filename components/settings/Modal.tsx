"use client";

import { useEffect } from "react";

export default function Modal({
  open,
  title,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70]">
      {/* Backdrop */}
      <button
        className="absolute inset-0 bg-black/20"
        onClick={onClose}
        aria-label="Close modal backdrop"
      />

      {/* Panel */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          className="
            w-full max-w-lg rounded-3xl bg-white/75 backdrop-blur-xl
            ring-1 ring-neutral-200/80 shadow-xl
          "
        >
          <div className="flex items-start justify-between gap-3 p-5 border-b border-neutral-200/70">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-neutral-900 truncate">{title}</p>
              <p className="mt-1 text-xs text-neutral-600">
                Secure actions require your current password.
              </p>
            </div>

            <button
              onClick={onClose}
              className="rounded-2xl px-3 py-2 text-sm ring-1 ring-neutral-200 hover:bg-neutral-50"
              aria-label="Close modal"
            >
              ✕
            </button>
          </div>

          <div className="p-5">{children}</div>
        </div>
      </div>
    </div>
  );
}
