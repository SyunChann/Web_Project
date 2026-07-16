import { MapPinned, Utensils } from "lucide-react";
import Link from "next/link";
import type { RestaurantsReviewScope } from "@/data/restaurants";

export function RestaurantScopeTabs({
  active,
  view = "list",
}: {
  active: RestaurantsReviewScope;
  view?: "list" | "map";
}) {
  const tabs = [
    { href: "/restaurants/items", label: "\uAD6D\uB0B4", icon: <Utensils size={16} />, key: "domestic" },
    { href: "/restaurants/items?scope=overseas", label: "\uD574\uC678", icon: <Utensils size={16} />, key: "overseas" },
    { href: "/restaurants/map", label: "\uC9C0\uB3C4", icon: <MapPinned size={16} />, key: "map" },
  ] as const;

  return (
    <nav aria-label="\uB9DB\uC9D1\uB9AC\uBDF0 \uBC94\uC704" className="sticky top-2 z-20 mb-5 flex w-fit rounded-md border border-[#d8cfc2] bg-white p-1 shadow-sm sm:static">
      {tabs.map((tab) => {
        const isActive = tab.key === "map" ? view === "map" : view === "list" && tab.key === active;
        const activeClass = tab.key === "overseas"
          ? "bg-[#0284c7] text-white"
          : tab.key === "map"
            ? "bg-[#0284c7] text-white"
          : "bg-[#e57632] text-white";

        return (
          <Link
            key={tab.key}
            href={tab.href}
            aria-current={isActive ? "page" : undefined}
            className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-bold transition sm:px-4 ${
              isActive ? activeClass : "text-[#52616b] hover:bg-[#f7f3ed]"
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
