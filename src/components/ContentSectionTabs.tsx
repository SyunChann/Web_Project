import { Bookmark, CalendarDays, Library, ShoppingCart } from "lucide-react";
import Link from "next/link";

type ContentSectionTabsProps = {
  active: "reviews" | "watchlist" | "calendar" | "merchandise";
};

export function ContentSectionTabs({ active }: ContentSectionTabsProps) {
  const themes: Record<string, { active: string; idle: string }> = {
    watchlist: {
      active: "bg-[#2f7f7a] text-white",
      idle: "text-[#52616b] hover:bg-[#eefaf8] hover:text-[#2f7f7a]",
    },
    calendar: {
      active: "bg-[#2f7f7a] text-white",
      idle: "text-[#52616b] hover:bg-[#eefaf8] hover:text-[#2f7f7a]",
    },
    reviews: {
      active: "bg-[#be4b49] text-white",
      idle: "text-[#52616b] hover:bg-[#fff7f5] hover:text-[#be4b49]",
    },
    merchandise: {
      active: "bg-[#9249be] text-white",
      idle: "text-[#52616b] hover:bg-[#fff7f5] hover:text-[#9249be]",
    },
  };

  const currentTheme = themes[active] || themes.reviews;

  const tabs = [
    { href: "/reviews", label: "\uB9AC\uBDF0", icon: <Library size={16} />, key: "reviews" },
    { href: "/watchlist/items", label: "\uAE30\uB300\uC791", icon: <Bookmark size={16} />, key: "watchlist" },
    { href: "/release-calendar", label: "\uB9B4\uB9AC\uC988 \uCE98\uB9B0\uB354", icon: <CalendarDays size={16} />, key: "calendar" },
    { href: "/merchandise", label: "\uC0C1\uD488", icon: <ShoppingCart size={16} />, key: "merchandise" },
  ] as const;

  return (
    <nav aria-label="\uCF58\uD150\uCE20 \uBA54\uB274" className="mb-5 flex w-fit rounded-md border border-[#d8cfc2] bg-white p-1 shadow-sm">
      {tabs.map((tab) => {
        const isActive = tab.key === active;

        return (
          <Link
            key={tab.key}
            href={tab.href}
            aria-current={isActive ? "page" : undefined}
            className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-bold transition sm:px-4 ${
              isActive ? currentTheme.active : currentTheme.idle
            }`}
          >
            {tab.icon}
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
