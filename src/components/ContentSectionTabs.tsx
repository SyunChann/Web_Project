import { Bookmark, CalendarDays, Library, ShoppingCart, Sparkles, Trophy } from "lucide-react";
import Link from "next/link";

type ContentSectionTabsProps = {
  active: "reviews" | "watchlist" | "calendar" | "merchandise" | "recommendations" | "lol";
};

export function ContentSectionTabs({ active }: ContentSectionTabsProps) {
  const tabs = [
    { href: "/reviews", label: "\uB9AC\uBDF0", mobileLabel: "\uB9AC\uBDF0", icon: <Library size={16} />, key: "reviews" },
    { href: "/watchlist/items", label: "\uAE30\uB300\uC791", mobileLabel: "\uAE30\uB300\uC791", icon: <Bookmark size={16} />, key: "watchlist" },
    { href: "/release-calendar", label: "애니 신작", mobileLabel: "애니 신작", icon: <CalendarDays size={16} />, key: "calendar" },
    { href: "/merchandise", label: "\uC0C1\uD488", mobileLabel: "\uC0C1\uD488", icon: <ShoppingCart size={16} />, key: "merchandise" },
    { href: "/recommendations", label: "\uCD94\uCC9C \uCF58\uD150\uCE20", mobileLabel: "\uCD94\uCC9C", icon: <Sparkles size={16} />, key: "recommendations" },
    { href: "/lck-calendar", label: "LoL", mobileLabel: "LoL", icon: <Trophy size={16} />, key: "lol" },
  ] as const;

  return <nav aria-label="콘텐츠 메뉴" className="section-tabs">{tabs.map(tab=><Link key={tab.key} href={tab.href} aria-current={active===tab.key?'page':undefined}>{tab.icon}<span>{tab.key==='recommendations'?'쇼핑 베스트':tab.label}</span></Link>)}</nav>;
}
