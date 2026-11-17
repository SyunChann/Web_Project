const listPaths = {
  reviews: ["/reviews"], watchlist: ["/watchlist/items"], merchandise: ["/merchandise"],
  restaurants: ["/restaurants/items"], travel: ["/travel", "/travel/items"], drinks: ["/drinks"],
} as const;
export type ListScope = keyof typeof listPaths;
export type ListVisit = {
  scope: ListScope; listHref: string; detailPath: string; anchorPath: string;
  scrollY: number; anchorTop: number; anchorIndex: number; savedAt: number; pendingRestore: boolean;
};
const memory = new Map<ListScope, ListVisit>();
const storageKey = (scope: ListScope) => `archive:list-position:v1:${scope}`;
export const listNavigationEvent = "archive:list-position";

export function listScope(pathname: string): ListScope | null {
  for (const [scope, paths] of Object.entries(listPaths)) if ((paths as readonly string[]).includes(pathname)) return scope as ListScope;
  return null;
}
export function detailLocation(pathname: string): { scope: ListScope; path: string } | null {
  const match = pathname.match(/^\/(reviews|watchlist|merchandise|restaurants|travel|drinks)\/([^/?#\\]+)(?:\/(?:edit|map))?$/);
  if (!match || ["new", "items", "map"].includes(match[2])) return null;
  return { scope: match[1] as ListScope, path: `/${match[1]}/${match[2]}` };
}

export function parseListVisit(value: unknown, now = Date.now()): ListVisit | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (typeof v.listHref !== "string" || v.listHref.length > 4096 || !v.listHref.startsWith("/") || v.listHref.startsWith("//") || v.listHref.includes("\\")) return null;
  try {
    const url = new URL(v.listHref, "https://archive.invalid");
    if (url.origin !== "https://archive.invalid" || listScope(url.pathname) !== v.scope) return null;
  } catch { return null; }
  if (typeof v.detailPath !== "string" || v.detailPath.length > 1024 || detailLocation(v.detailPath)?.scope !== v.scope || detailLocation(v.detailPath)?.path !== v.detailPath) return null;
  if (typeof v.anchorPath !== "string" || v.anchorPath.length > 1024 || detailLocation(v.anchorPath)?.scope !== v.scope || detailLocation(v.anchorPath)?.path !== v.anchorPath) return null;
  if (typeof v.savedAt !== "number" || !Number.isFinite(v.savedAt) || now - v.savedAt > 86400_000 || v.savedAt > now + 60_000) return null;
  if (typeof v.scrollY !== "number" || !Number.isFinite(v.scrollY) || v.scrollY < 0 || v.scrollY > 10_000_000) return null;
  if (typeof v.anchorTop !== "number" || !Number.isFinite(v.anchorTop) || Math.abs(v.anchorTop) > 10_000_000) return null;
  if (typeof v.anchorIndex !== "number" || !Number.isInteger(v.anchorIndex) || v.anchorIndex < 0 || v.anchorIndex > 1000) return null;
  return { scope: v.scope as ListScope, listHref: v.listHref, detailPath: v.detailPath, anchorPath: v.anchorPath, savedAt: v.savedAt, scrollY: v.scrollY, anchorTop: v.anchorTop, anchorIndex: v.anchorIndex, pendingRestore: v.pendingRestore === true };
}

export function readListVisit(scope: ListScope): ListVisit | null {
  if (typeof window === "undefined") return null;
  let saved = parseListVisit(memory.get(scope));
  if (!saved) {
    try { saved = parseListVisit(JSON.parse(sessionStorage.getItem(storageKey(scope)) ?? "null")); } catch { /* Browser storage can be disabled. */ }
  }
  return saved?.scope === scope ? saved : null;
}
export function writeListVisit(visit: ListVisit) {
  memory.set(visit.scope, visit);
  try { sessionStorage.setItem(storageKey(visit.scope), JSON.stringify(visit)); } catch { /* Keep restoring within this tab even if storage is unavailable. */ }
  window.dispatchEvent(new Event(listNavigationEvent));
}
export function matchingListLinks(path: string) {
  return Array.from(document.querySelectorAll<HTMLAnchorElement>("a[href]")).filter((link) => {
    try {
      const url = new URL(link.href);
      return url.origin === location.origin && url.pathname === path;
    } catch { return false; }
  });
}
