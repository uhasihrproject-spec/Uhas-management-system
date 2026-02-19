// app/letters/[id]/LetterViewer.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Download,
  FileText,
  Image as ImageIcon,
  Loader2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
} from "lucide-react";

type Conf = "PUBLIC" | "INTERNAL" | "CONFIDENTIAL";

function extOf(name: string) {
  const x = name.split(".").pop();
  return (x || "").toUpperCase();
}

function kindLabel(mime: string) {
  if (mime === "application/pdf") return "PDF Document";
  if (mime.startsWith("image/")) return "Image File";
  return "Document";
}

export default function LetterViewer({
  letterId,
  filePath,
  fileName,
  mimeType,

  // optional (parent can pass without TS errors)
  confidentiality,
  recipientDepartment,
  summary,
}: {
  letterId: string;
  filePath: string;
  fileName: string;
  mimeType: string;
  confidentiality?: Conf | null;
  recipientDepartment?: string | null;
  summary?: string | null;
}) {
  const [url, setUrl] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  const isPdf = mimeType === "application/pdf";
  const isImage = mimeType.startsWith("image/");
  const fileExt = useMemo(() => extOf(fileName), [fileName]);

  const downloadHref = useMemo(
    () =>
      `/api/letters/download?path=${encodeURIComponent(
        filePath
      )}&letterId=${encodeURIComponent(letterId)}`,
    [filePath, letterId]
  );

  const Icon = isPdf ? FileText : isImage ? ImageIcon : FileText;

  async function loadSignedUrl() {
    setErr("");
    setLoading(true);
    try {
      const res = await fetch("/api/letters/signed-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filePath }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to load document");
      setUrl(json.url);
    } catch (e: any) {
      setErr(e?.message || "Failed to load document");
      setUrl("");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setErr("");
        setLoading(true);
        const res = await fetch("/api/letters/signed-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filePath }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "Failed to load document");
        if (!cancelled) {
          setUrl(json.url);
          setLoading(false);
        }
      } catch (e: any) {
        if (!cancelled) {
          setErr(e?.message || "Failed to load document");
          setUrl("");
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [filePath]);

  if (err) {
    return (
      <div className="rounded-3xl bg-white ring-1 ring-red-200/70 overflow-hidden">
        <div className="p-5 sm:p-6 bg-gradient-to-br from-red-50 to-white border-b border-red-200/60">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-2xl bg-red-100 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm sm:text-base font-semibold text-neutral-900">
                Unable to load document
              </h3>
              <p className="mt-1 text-sm text-red-700 break-words">{err}</p>
              <p className="mt-2 text-xs text-neutral-600">
                Try again, or download the file to view it offline.
              </p>

              <div className="mt-4 flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={loadSignedUrl}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold text-black bg-emerald-100 hover:bg-emerald-200 active:bg-emerald-300 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Retry
                </button>

                <a
                  href={downloadHref}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold text-black border border-neutral-200 hover:bg-neutral-50 active:bg-neutral-100 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="p-5 sm:p-6">
          <div className="rounded-2xl bg-neutral-50 ring-1 ring-neutral-200/60 p-4 text-xs text-neutral-600">
            If you keep seeing this error, your signed URL endpoint may be failing or the file path
            is incorrect.
          </div>
        </div>
      </div>
    );
  }

  if (loading || !url) {
    return (
      <div className="rounded-3xl bg-white ring-1 ring-neutral-200/70">
        <div className="p-6 sm:p-8">
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-3xl bg-emerald-50 flex items-center justify-center mb-4 ring-1 ring-emerald-100">
              <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
            </div>
            <p className="text-sm font-semibold text-neutral-900">Loading document</p>
            <p className="mt-1 text-xs text-neutral-600">
              Preparing preview and download link…
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl bg-white ring-1 ring-neutral-200/70 overflow-hidden">
      {/* Header */}
      <div className="border-b border-neutral-200/70 bg-gradient-to-br from-neutral-50 to-white">
        <div className="p-4 sm:p-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center flex-shrink-0 ring-1 ring-emerald-100">
              <Icon className="w-5 h-5 text-emerald-600" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold text-neutral-900 truncate">{fileName}</p>
                {fileExt ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-neutral-100 text-neutral-700 ring-1 ring-neutral-200/60">
                    {fileExt}
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-xs text-neutral-600">{kindLabel(mimeType)}</p>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={loadSignedUrl}
                  className="inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold border border-neutral-200 hover:bg-neutral-50 active:bg-neutral-100 transition-colors"
                  title="Refresh preview"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Refresh
                </button>

                {isPdf ? (
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold border border-neutral-200 hover:bg-neutral-50 active:bg-neutral-100 transition-colors"
                    title="Open preview in a new tab"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Open
                  </a>
                ) : null}
              </div>
            </div>
          </div>

          <a
            href={downloadHref}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold text-black bg-emerald-100 hover:bg-emerald-200 active:bg-emerald-300 transition-colors shadow-sm hover:shadow whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            Download
          </a>
        </div>
      </div>

      {/* Content */}
      <div className="bg-neutral-50">
        {isPdf ? (
          <div className="relative">
            <iframe
              title={fileName}
              src={url}
              className="w-full border-0 h-[70vh] min-h-[520px] lg:h-[calc(100vh-18rem)]"
            />
          </div>
        ) : isImage ? (
          <div className="p-4 sm:p-6 flex items-center justify-center bg-neutral-100 min-h-[520px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={fileName}
              className="max-w-full max-h-[70vh] lg:max-h-[calc(100vh-20rem)] object-contain rounded-2xl shadow-lg ring-1 ring-black/5"
            />
          </div>
        ) : (
          <div className="p-8 sm:p-12 flex flex-col items-center justify-center min-h-[420px]">
            <div className="w-16 h-16 rounded-3xl bg-neutral-200 flex items-center justify-center mb-4 ring-1 ring-neutral-300">
              <FileText className="w-8 h-8 text-neutral-500" />
            </div>
            <p className="text-sm font-semibold text-neutral-900">Preview not available</p>
            <p className="mt-2 text-sm text-neutral-600 text-center max-w-md">
              This file type can’t be previewed in the browser. Download it to view.
            </p>
            <a
              href={downloadHref}
              className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold text-black bg-emerald-100 hover:bg-emerald-200 active:bg-emerald-300 transition-colors"
            >
              <Download className="w-4 h-4" />
              Download file
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
