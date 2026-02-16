"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export default function TopLoader() {
  const pathname = usePathname();
  const sp = useSearchParams();
  const [show, setShow] = useState(false);

  useEffect(() => {
    // show loader on route change
    setShow(true);

    // hide after a short moment (feels real + not annoying)
    const t = setTimeout(() => setShow(false), 450);
    return () => clearTimeout(t);
  }, [pathname, sp]);

  if (!show) return null;
  return <div className="toploader" />;
}
