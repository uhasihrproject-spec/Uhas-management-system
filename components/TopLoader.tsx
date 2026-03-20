"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export default function TopLoader() {
  const pathname = usePathname();
  const sp = useSearchParams();
  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(true);
    const t = setTimeout(() => setShow(false), 650);
    return () => clearTimeout(t);
  }, [pathname, sp]);

  if (!show) return null;

  return (
    <div className="toploader-shell" aria-hidden="true">
      <div className="toploader-track">
        <span className="toploader-dot dot-a" />
        <span className="toploader-dot dot-b" />
        <span className="toploader-dot dot-c" />
      </div>
    </div>
  );
}
