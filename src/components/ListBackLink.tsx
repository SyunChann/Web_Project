"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { detailLocation, listNavigationEvent, readListVisit, writeListVisit } from "@/lib/listNavigation";

export function ListBackLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  const pathname = usePathname();
  const [saved, setSaved] = useState<{ path: string; href?: string }>();
  const remembered = saved?.path === pathname ? saved.href : undefined;
  useEffect(() => {
    const update = () => {
      const detail = detailLocation(pathname);
      const visit = detail ? readListVisit(detail.scope) : null;
      setSaved({ path: pathname, href: visit?.detailPath === detail?.path ? visit?.listHref : undefined });
    };
    update();
    window.addEventListener(listNavigationEvent, update);
    return () => window.removeEventListener(listNavigationEvent, update);
  }, [pathname]);
  return <Link href={remembered ?? href} className={className} scroll={!remembered} onNavigate={() => {
    const detail = detailLocation(pathname);
    const visit = detail ? readListVisit(detail.scope) : null;
    if (visit && visit.detailPath === detail?.path) writeListVisit({ ...visit, pendingRestore: true });
  }}>{children}</Link>;
}
