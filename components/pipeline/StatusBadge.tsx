// components/pipeline/StatusBadge.tsx

type Props = { status: string; size?: "sm" | "md" }

const MAP: Record<string, { bg: string; text: string; label: string }> = {
  // Pipeline statuses
  IN_PROGRESS: { bg: "bg-blue-50",   text: "text-blue-700",  label: "In Progress" },
  COMPLETED:   { bg: "bg-green-50",  text: "text-green-700", label: "Completed"   },
  CANCELLED:   { bg: "bg-red-50",    text: "text-red-600",   label: "Cancelled"   },

  // Step statuses
  ACTIVE:  { bg: "bg-yellow-50", text: "text-yellow-700", label: "Active"  },
  PENDING: { bg: "bg-neutral-100", text: "text-neutral-500", label: "Pending" },
  DONE:    { bg: "bg-green-50",  text: "text-green-700",  label: "Done"    },
  SKIPPED: { bg: "bg-neutral-100", text: "text-neutral-400", label: "Skipped" },

  // Letter statuses
  RECEIVED: { bg: "bg-neutral-100", text: "text-neutral-600", label: "Received" },
  SCANNED:  { bg: "bg-blue-50",    text: "text-blue-600",    label: "Scanned"  },
  ASSIGNED: { bg: "bg-yellow-50",  text: "text-yellow-700",  label: "Assigned" },
  ARCHIVED: { bg: "bg-neutral-100", text: "text-neutral-500", label: "Archived" },
}

export function StatusBadge({ status, size = "sm" }: Props) {
  const s = MAP[status] ?? { bg: "bg-neutral-100", text: "text-neutral-500", label: status }
  const px = size === "md" ? "px-2.5 py-0.5 text-xs" : "px-2 py-0.5 text-[11px]"
  return (
    <span className={`inline-flex items-center rounded-full font-medium tracking-wide ${px} ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  )
}