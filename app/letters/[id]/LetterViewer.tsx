"use client";

import { useEffect, useState } from "react";

export default function LetterViewer({
  letterId,
  filePath,
  fileName,
  mimeType,
}: {
  letterId: string;
  filePath: string;
  fileName: string;
  mimeType: string;
}) {
  const [url, setUrl] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setErr("");
        const res = await fetch("/api/letters/signed-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filePath }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "Failed to load document");
        if (!cancelled) setUrl(json.url);
      } catch (e: any) {
        if (!cancelled) setErr(e.message || "Failed to load document");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [filePath]);

  if (err) {
    return (
      <div className="rounded-3xl bg-white p-6 ring-1 ring-red-200/70">
        <p className="text-sm text-red-700">{err}</p>
      </div>
    );
  }

  if (!url) {
    return (
      <div className="rounded-3xl bg-white p-6 ring-1 ring-neutral-200/70">
        <p className="text-sm text-neutral-700">Loading document…</p>
      </div>
    );
  }

  const isPdf = mimeType === "application/pdf";
  const isImage = mimeType.startsWith("image/");

  return (
    <div className="rounded-3xl bg-white ring-1 ring-neutral-200/70 overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-neutral-200/70 p-4">
        <div className="min-w-0">
          <p className="text-xs text-neutral-500">Scanned Document</p>
          <p className="text-sm font-medium truncate text-neutral-900">{fileName}</p>
        </div>

        <a
        href={`/api/letters/download?path=${encodeURIComponent(filePath)}&name=${encodeURIComponent(fileName)}&letterId=${encodeURIComponent(letterId)}`}
        className="shrink-0 rounded-2xl px-4 py-2 text-sm font-semibold text-white
        bg-gradient-to-r from-emerald-600 to-amber-500 hover:brightness-95"
        >
        Download File
        </a>

      </div>

      <div className="bg-neutral-50">
        {isPdf ? (
          <iframe title={fileName} src={url} className="w-full h-[70vh]" />
        ) : isImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={fileName} className="w-full max-h-[75vh] object-contain" />
        ) : (
          <div className="p-6">
            <p className="text-sm text-neutral-700">
              Preview not supported. Use download.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
