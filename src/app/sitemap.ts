import type { MetadataRoute } from "next";
import { getMerchandiseReviews } from "@/data/merchandise";
import { getRestaurantsReviews } from "@/data/restaurants";
import { getReviews } from "@/data/reviews";
import { getTravels, groupTravelPosts } from "@/data/travel";
import { getWatchItems } from "@/data/watchlist";
import { getSiteUrl } from "@/lib/siteUrl";

const publicRoutes = [
  { path: "", changeFrequency: "weekly", priority: 1 },
  { path: "/reviews", changeFrequency: "weekly", priority: 0.9 },
  { path: "/watchlist/items", changeFrequency: "weekly", priority: 0.8 },
  { path: "/merchandise", changeFrequency: "weekly", priority: 0.8 },
  { path: "/recommendations", changeFrequency: "weekly", priority: 0.9 },
  { path: "/restaurants/items", changeFrequency: "weekly", priority: 0.8 },
  { path: "/restaurants/map/domestic", changeFrequency: "weekly", priority: 0.6 },
  { path: "/restaurants/map/overseas", changeFrequency: "weekly", priority: 0.6 },
  { path: "/travel/items", changeFrequency: "weekly", priority: 0.8 },
  { path: "/travel/map", changeFrequency: "weekly", priority: 0.6 },
  { path: "/release-calendar", changeFrequency: "daily", priority: 0.7 },
  { path: "/lck-calendar", changeFrequency: "daily", priority: 0.7 },
  { path: "/lck-analysis", changeFrequency: "weekly", priority: 0.6 },
] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const [reviews, watchItems, domesticRestaurants, overseasRestaurants, travels, merchandise] =
    await Promise.all([
      getReviews(),
      getWatchItems(),
      getRestaurantsReviews("domestic"),
      getRestaurantsReviews("overseas"),
      getTravels(),
      getMerchandiseReviews(),
    ]);

  const entries: MetadataRoute.Sitemap = publicRoutes.map((route) => ({
    url: `${siteUrl}${route.path}`,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
  const addContent = (path: string, id: string, updatedAt: string, priority = 0.7) => {
    entries.push({
      url: `${siteUrl}${path}/${encodeURIComponent(id)}`,
      lastModified: updatedAt,
      changeFrequency: "monthly",
      priority,
    });
  };

  reviews.forEach((item) => addContent("/reviews", item.id, item.updatedAt, 0.8));
  watchItems.forEach((item) => addContent("/watchlist", item.id, item.updatedAt));
  [...domesticRestaurants, ...overseasRestaurants].forEach((item) =>
    addContent("/restaurants", item.id, item.updatedAt),
  );
  groupTravelPosts(travels).forEach(({ travel }) =>
    addContent("/travel", travel.id, travel.updatedAt),
  );
  merchandise.forEach((item) => addContent("/merchandise", item.id, item.updatedAt));

  return [...new Map(entries.map((entry) => [entry.url, entry])).values()];
}
