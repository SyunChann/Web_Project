import { Bookmark, CalendarDays, Library, ShoppingCart, Sparkles, Trophy } from "lucide-react";
import Link from "next/link";

type ContentSectionTabsProps = {
  active: "reviews" | "watchlist" | "calendar" | "merchandise" | "recommendations" | "lol";
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
    recommendations: {
      active: "bg-[#be4b49] text-white",
      idle: "text-[#52616b] hover:bg-[#fff7f5] hover:text-[#be4b49]",
    },
    lol: {
      active: "bg-[#e32732] text-white",
      idle: "text-[#52616b] hover:bg-[#fff0f0] hover:text-[#e32732]",
    },
  };

  const currentTheme = themes[active] || themes.reviews;

  const tabs = [
    { href: "/reviews", label: "\uB9AC\uBDF0", icon: <Library size={16} />, key: "reviews" },
    { href: "/watchlist/items", label: "\uAE30\uB300\uC791", icon: <Bookmark size={16} />, key: "watchlist" },
    { href: "/release-calendar", label: "\uB9B4\uB9AC\uC988 \uCE98\uB9B0\uB354", icon: <CalendarDays size={16} />, key: "calendar" },
    { href: "/merchandise", label: "\uC0C1\uD488", icon: <ShoppingCart size={16} />, key: "merchandise" },
    { href: "/recommendations", label: "\uCD94\uCC9C \uCF58\uD150\uCE20", icon: <Sparkles size={16} />, key: "recommendations" },
    { href: "/lck-calendar", label: "LoL", icon: <Trophy size={16} />, key: "lol" },
  ] as const;

  return (
    <nav
      aria-label="\uCF58\uD150\uCE20 \uBA54\uB274"
      className="mb-5 grid w-full grid-cols-3 gap-1 rounded-xl border border-[#d8cfc2] bg-white p-1.5 shadow-sm sm:flex sm:w-fit sm:max-w-full sm:overflow-x-auto sm:rounded-md sm:p-1"
    >
      {tabs.map((tab) => {
        const isActive = tab.key === active;

        return (
          <Link
            key={tab.key}
            href={tab.href}
            aria-current={isActive ? "page" : undefined}
            className={`flex min-w-0 flex-col items-center justify-center gap-1 whitespace-nowrap rounded-lg px-1 py-2 text-[11px] font-bold leading-none transition sm:inline-flex sm:shrink-0 sm:flex-row sm:gap-2 sm:rounded-md sm:px-4 sm:text-sm ${
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
