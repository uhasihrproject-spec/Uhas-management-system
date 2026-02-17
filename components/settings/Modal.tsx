"use client";

import { useEffect, useId, useRef } from "react";

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
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement | null>(null);

  // Escape + body scroll lock + focus
  useEffect(() => {
    if (!open) return;

    const prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKey);

    // Focus the panel for accessibility
    setTimeout(() => panelRef.current?.focus(), 0);

    return () => {
      document.documentElement.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70]" role="presentation">
      {/* Backdrop */}
      <button
        type="button"
        className="absolute inset-0 bg-black/25"
        onClick={onClose}
        aria-label="Close modal"
      />

      {/* Panel */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          ref={panelRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className="
            w-full max-w-lg rounded-3xl bg-white
            ring-1 ring-neutral-200/80 shadow-xl
            focus:outline-none
          "
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3 p-5 border-b border-neutral-200/70">
            <div className="min-w-0">
              <p
                id={titleId}
                className="text-sm font-semibold text-neutral-900 truncate"
              >
                {title}
              </p>
              <p className="mt-1 text-xs text-neutral-600">
                Secure actions require your current password.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl px-3 py-2 text-sm ring-1 ring-neutral-200 hover:bg-neutral-50 transition"
              aria-label="Close"
            >
              ×
            </button>
          </div>

          {/* Body (scrolls if needed) */}
          <div className="p-5 max-h-[70vh] overflow-auto">{children}</div>
        </div>
      </div>
    </div>
  );
}
