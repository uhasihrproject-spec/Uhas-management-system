"use client";

import * as React from "react";

export default function LoadingButton({
  loading,
  children,
  loadingText = "Working…",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  loading: boolean;
  loadingText?: string;
}) {
  return (
    <button
      {...props}
      disabled={loading || props.disabled}
      className={
        "relative rounded-2xl px-4 py-2 text-sm font-semibold text-white " +
        "bg-gradient-to-r from-emerald-600 to-amber-500 hover:brightness-95 " +
        "disabled:opacity-60 " +
        className
      }
    >
      {loading ? (
        <span className="inline-flex items-center gap-2">
          <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
          {loadingText}
        </span>
      ) : (
        children
      )}
    </button>
  );
}
