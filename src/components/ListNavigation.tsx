"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { detailLocation, listScope, matchingListLinks, readListVisit, writeListVisit, type ListVisit } from "@/lib/listNavigation";

function restorePosition(visit: ListVisit) {
  let stopped = false;
  let frame = 0;
  const stop = () => {
    stopped = true; cancelAnimationFrame(frame); clearTimeout(timer);
    resize.disconnect(); mutations.disconnect();
    for (const event of ["wheel", "touchstart", "pointerdown", "keydown"]) window.removeEventListener(event, stop);
  };
  const apply = () => {
    if (stopped) return;
    const links = matchingListLinks(visit.anchorPath);
    const anchor = links[visit.anchorIndex] ?? links[0];
    const top = anchor ? scrollY + anchor.getBoundingClientRect().top - Math.min(visit.anchorTop, innerHeight - 80) : visit.scrollY;
    window.scrollTo({ top: Math.max(0, top), behavior: "instant" });
    if (anchor) { anchor.focus({ preventScroll: true }); mutations.disconnect(); }
  };
  const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(apply); };
  const resize = new ResizeObserver(schedule);
  const mutations = new MutationObserver(schedule);
  resize.observe(document.body);
  mutations.observe(document.body, { childList: true, subtree: true });
  for (const event of ["wheel", "touchstart", "pointerdown", "keydown"]) window.addEventListener(event, stop, { passive: true });
  const timer = setTimeout(stop, 3000);
  // Wait until Next has finished its own scroll handling for the new page.
  frame = requestAnimationFrame(() => { frame = requestAnimationFrame(apply); });
  return stop;
}

export function ListNavigation() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const previous = useRef<string | null>(null);

  useEffect(() => {
    const click = (event: MouseEvent) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || !(event.target instanceof Element)) return;
      const link = event.target.closest<HTMLAnchorElement>("a[href]");
      if (!link || link.hasAttribute("download") || (link.target && link.target !== "_self")) return;
      const destination = new URL(link.href);
      if (destination.origin !== location.origin) return;
      const target = detailLocation(destination.pathname);
      if (!target) return;
      const scope = listScope(location.pathname);
      if (scope === target.scope) {
        writeListVisit({ scope, listHref: location.pathname + location.search + location.hash, detailPath: target.path, anchorPath: target.path,
          scrollY: Math.max(0, scrollY), anchorTop: link.getBoundingClientRect().top, anchorIndex: Math.max(0, matchingListLinks(target.path).indexOf(link)), savedAt: Date.now(), pendingRestore: false });
      } else if (detailLocation(location.pathname)?.scope === target.scope) {
        const visit = readListVisit(target.scope);
        if (visit && visit.detailPath === detailLocation(location.pathname)?.path) writeListVisit({ ...visit, detailPath: target.path, pendingRestore: false });
      }
    };
    const pop = () => {
      const detail = detailLocation(location.pathname);
      const from = new URL(previous.current ?? location.href, location.origin);
      const fromDetail = detailLocation(from.pathname);
      if (detail) {
        const visit = readListVisit(detail.scope);
        if (visit && (visit.detailPath === detail.path || visit.listHref === from.pathname + from.search + from.hash || visit.detailPath === fromDetail?.path)) writeListVisit({ ...visit, detailPath: detail.path, pendingRestore: false });
      }
      const scope = listScope(location.pathname);
      const visit = scope ? readListVisit(scope) : null;
      if (visit && fromDetail?.path === visit.detailPath
        && visit.listHref === location.pathname + location.search + location.hash) writeListVisit({ ...visit, pendingRestore: true });
    };
    document.addEventListener("click", click, true);
    window.addEventListener("popstate", pop);
    return () => { document.removeEventListener("click", click, true); window.removeEventListener("popstate", pop); };
  }, []);

  useEffect(() => {
    const initial = previous.current === null;
    previous.current = location.href;
    const scope = listScope(pathname);
    const visit = scope ? readListVisit(scope) : null;
    const historyReturn = initial && performance.getEntriesByType("navigation").some((entry) => (entry as PerformanceNavigationTiming).type === "back_forward");
    if (!visit || visit.listHref !== location.pathname + location.search + location.hash || (!visit.pendingRestore && !historyReturn)) return;
    writeListVisit({ ...visit, pendingRestore: false });
    return restorePosition(visit);
  }, [pathname, search]);
  return null;
}
