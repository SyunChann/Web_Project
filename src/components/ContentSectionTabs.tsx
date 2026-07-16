import { Bookmark, Library } from "lucide-react";
import Link from "next/link";

type ContentSectionTabsProps = {
  active: "reviews" | "watchlist";
};

export function ContentSectionTabs({ active }: ContentSectionTabsProps) {
  const theme = active === "watchlist"
    ? {
        active: "bg-[#2f7f7a] text-white",
        idle: "text-[#52616b] hover:bg-[#eefaf8] hover:text-[#2f7f7a]",
      }
    : {
        active: "bg-[#be4b49] text-white",
        idle: "text-[#52616b] hover:bg-[#fff7f5] hover:text-[#be4b49]",
      };
  const tabs = [
    { href: "/reviews", label: "\uB9AC\uBDF0", icon: <Library size={16} />, key: "reviews" },
    { href: "/watchlist/items", label: "\uAE30\uB300\uC791", icon: <Bookmark size={16} />, key: "watchlist" },
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
              isActive ? theme.active : theme.idle
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
