"use client";

import { useEffect } from "react";

export default function FloatingAlert({
  type,
  message,
  onClose,
}: {
  type: "success" | "error";
  message: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);

  const cls =
    type === "success"
      ? "bg-emerald-100 text-black border-emerald-200"
      : "bg-red-50 text-red-800 border-red-200";

  return (
    <div className="fixed bottom-4 right-4 z-[60] w-[92vw] max-w-sm">
      <div className={`rounded-2xl border px-4 py-3 shadow-sm ${cls}`}>
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-semibold">{message}</p>
          <button
            onClick={onClose}
            className="text-sm font-bold opacity-70 hover:opacity-100"
            aria-label="Close"
            type="button"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
