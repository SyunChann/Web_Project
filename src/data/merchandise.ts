import { unstable_cache } from "next/cache";
import { createSupabasePublicClient } from "@/lib/supabase/public";

export type MerchandiseReview = {
  id: string;
  title: string;
  category: "electronics" | "fashion" | "cosmetics" | "supplements" | "lifestyle" | "sports" | "other";
  tags: string[];
  rating: number;
  purchasedAt: string;
  createdAt: string;
  updatedAt: string;
  thumbnail: string;
  thumbnailAlt: string;
  summary: string;
  review: string;
  productId?: string | null;
  productName?: string | null;
  currentLowestPrice?: number | null;
  purchaseUrl?: string | null;
  authorId?: string | null;
  authorName?: string | null;
};

export type MerchandiseReviewSort = "created-desc" | "purchased-desc" | "rating-desc";

type MerchandiseReviewRow = {
  id: string;
  title: string;
  category: MerchandiseReview["category"];
  tags: string[] | null;
  rating: number;
  purchased_at: string;
  created_at: string;
  updated_at: string;
  thumbnail: string | null;
  thumbnail_alt: string | null;
  summary: string;
  review: string;
  product_id: string | null;
  product_name: string | null;
  current_lowest_price: number | null;
  purchase_url: string | null;
  author_id: string | null;
  author_name: string | null;
};

const merchandiseReviewSelect =
  "id, title, category, tags, rating, purchased_at, created_at, updated_at, thumbnail, thumbnail_alt, summary, review, product_id, product_name, current_lowest_price, purchase_url, author_id, author_name";

function formatAuthorName(value: string | null) {
  const name = value?.trim();

  if (!name) {
    return null;
  }

  const displayName = name.includes("@") ? name.split("@")[0] : name;

  return displayName.toLowerCase() === "admin" ? "관리자" : displayName;
}

function mapReviewRow(row: MerchandiseReviewRow): MerchandiseReview {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    tags: row.tags ?? [],
    rating: row.rating,
    purchasedAt: row.purchased_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    thumbnail: row.thumbnail ?? "/thumbnails/your-name.svg",
    thumbnailAlt: row.thumbnail_alt ?? `${row.title} 리뷰 썸네일`,
    summary: row.summary,
    review: row.review,
    productId: row.product_id,
    productName: row.product_name,
    currentLowestPrice: row.current_lowest_price,
    purchaseUrl: row.purchase_url,
    authorId: row.author_id,
    authorName: formatAuthorName(row.author_name),
  };
}

function sortByCreatedAtDesc(a: MerchandiseReview, b: MerchandiseReview) {
  return (
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() ||
    new Date(b.purchasedAt).getTime() - new Date(a.purchasedAt).getTime() ||
    a.title.localeCompare(b.title)
  );
}

function sortByPurchasedAtDesc(a: MerchandiseReview, b: MerchandiseReview) {
  return (
    new Date(b.purchasedAt).getTime() - new Date(a.purchasedAt).getTime() ||
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() ||
    a.title.localeCompare(b.title)
  );
}

function sortByRatingDesc(a: MerchandiseReview, b: MerchandiseReview) {
  return (
    b.rating - a.rating ||
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() ||
    a.title.localeCompare(b.title)
  );
}

export function sortReviews(reviews: MerchandiseReview[], sort: MerchandiseReviewSort) {
  const sortedReviews = [...reviews];

  if (sort === "purchased-desc") {
    return sortedReviews.sort(sortByPurchasedAtDesc);
  }

  if (sort === "rating-desc") {
    return sortedReviews.sort(sortByRatingDesc);
  }

  return sortedReviews.sort(sortByCreatedAtDesc);
}

async function getMerchandiseReviewsFromSupabase() {
  const supabase = createSupabasePublicClient();

  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("merchandise_reviews")
    .select(merchandiseReviewSelect)
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return sortReviews((data as MerchandiseReviewRow[]).map(mapReviewRow), "created-desc");
}

async function getMerchandiseReviewFromSupabase(id: string) {
  const supabase = createSupabasePublicClient();

  if (!supabase) {
    return undefined;
  }

  const { data, error } = await supabase
    .from("merchandise_reviews")
    .select(merchandiseReviewSelect)
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    return undefined;
  }

  return mapReviewRow(data as MerchandiseReviewRow);
}

export const getMerchandiseReviews = unstable_cache(
  getMerchandiseReviewsFromSupabase,
  ["merchandise-reviews"],
  {
    tags: ["merchandise-reviews"],
    revalidate: 60,
  },
);

export const getMerchandiseReview = unstable_cache(
  getMerchandiseReviewFromSupabase,
  ["merchandise-reviews"],
  {
    tags: ["merchandise-reviews"],
    revalidate: 60,
  },
);

export function categoryLabel(category: MerchandiseReview["category"]) {
  const labels = {
    electronics: "전자제품",
    fashion: "패션",
    cosmetics: "화장품",
    supplements: "영양제",
    lifestyle: "라이프스타일",
    sports: "스포츠",
    other: "기타"
  };

  return labels[category];
}

export function categoryTheme(category: MerchandiseReview["category"]) {
  const themes = {
    electronics: {
      badge: "bg-[#e7ecfd] text-[#3552a7]",
      border: "border-l-[#4a47d2]",
      text: "text-[#494cbe]",
    },
    fashion: {
      badge: "bg-[#ffe9e9] text-[#b84646]",
      border: "border-l-[#d86565]",
      text: "text-[#c75959]",
    },
    cosmetics: {
      badge: "bg-[#e5f4ed] text-[#247053]",
      border: "border-l-[#2f9d72]",
      text: "text-[#2f7f61]",
    },
    supplements: {
      badge: "bg-[#fff0d9] text-[#9a5a13]",
      border: "border-l-[#d9902f]",
      text: "text-[#b56f1d]",
    },
    lifestyle: {
      badge: "bg-[#d9fffa] text-[#13999a]",
      border: "border-l-[#2fd0d9]",
      text: "text-[#1db4b5]",
    },
    sports: {
      badge: "bg-[#fbd9ff] text-[#74139a]",
      border: "border-l-[#b12fd9]",
      text: "text-[#981db5]",
    },
    other: {
      badge: "bg-[#fffed9] text-[#979a13]",
      border: "border-l-[#c5d92f]",
      text: "text-[#a3b51d]",
    },
  };

  return themes[category];
}
