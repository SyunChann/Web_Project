export const drinkCategories = { whisky: "위스키", sake: "사케", traditional: "전통주", beer: "맥주", other: "기타" } as const;
export const drinkKinds = { review: "마신 술 리뷰", curious: "궁금한 술" } as const;
export const drinkingMethods = ["스트레이트", "온더록", "하이볼", "물 타서", "차갑게", "상온", "따뜻하게", "기타"] as const;
export const tasteTags = ["달콤함", "드라이함", "과일향", "꽃향", "곡물향", "견과류", "바닐라", "스모키", "오크향", "산뜻함", "묵직함", "깔끔함", "부드러움", "산미", "긴 여운"] as const;
export type DrinkCategory = keyof typeof drinkCategories;
export type DrinkKind = keyof typeof drinkKinds;
export type DrinkPost = {
  id: string; name: string; category: DrinkCategory; kind: DrinkKind; rating: number | null;
  body: string; methods: string[]; tags: string[]; images: string[];
  author_id: string | null; author_name: string; created_at: string; updated_at: string;
};
export type DrinkPostPreview = Pick<DrinkPost, "id" | "name" | "category" | "kind" | "rating" | "tags" | "author_name" | "created_at"> & { excerpt: string; image: string | null };
export type DrinkSaveResult = { error?: string; id?: string };
export const drinkBucket = "drink-photos";
export const maxDrinkPhotos = 5;
export const maxDrinkPhotoSize = 5 * 1024 * 1024;
export const drinkImageTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export type DrinkFilterParams = { q?: string; category?: string; kind?: string; page?: string; rating?: string; tag?: string };
export function readDrinkFilters(params: DrinkFilterParams) {
  const q = (typeof params.q === "string" ? params.q : "").trim().slice(0, 80);
  const category = typeof params.category === "string" && Object.hasOwn(drinkCategories, params.category) ? params.category : "";
  const kind = typeof params.kind === "string" && Object.hasOwn(drinkKinds, params.kind) ? params.kind : "";
  const value = typeof params.rating === "string" ? Number(params.rating) : NaN;
  const rating = value >= .5 && value <= 5 && Number.isInteger(value * 2) ? String(value) : "";
  const tag = typeof params.tag === "string" && (tasteTags as readonly string[]).includes(params.tag) ? params.tag : "";
  const page = Math.max(1, Math.min(10000, Math.floor(Number(params.page) || 1)));
  return { q, category, kind, rating, tag, page };
}

export function drinkAuthorName(user: { id: string; email?: string; user_metadata?: Record<string, unknown> }) {
  const metadata = user.user_metadata;
  const displayName = [metadata?.display_name, metadata?.name, metadata?.full_name]
    .find((value): value is string => typeof value === "string" && Boolean(value.trim()));
  return (displayName?.trim() || user.email?.split("@")[0]?.trim() || `사용자 ${user.id.slice(0, 8)}`).slice(0, 60);
}

export function readDrinkPayload(data: FormData, userId: string) {
  const name = String(data.get("name") ?? "").trim();
  const body = String(data.get("body") ?? "").trim();
  const category = String(data.get("category") ?? "");
  const kind = String(data.get("kind") ?? "");
  const rating = kind === "review" ? Number(data.get("rating")) : null;
  if (!name || name.length > 100) throw new Error("술 이름은 1~100자로 입력해 주세요.");
  if (!body || body.length > 10000) throw new Error("본문은 1~10,000자로 입력해 주세요.");
  if (!Object.hasOwn(drinkCategories, category) || !Object.hasOwn(drinkKinds, kind)) throw new Error("술 종류와 글 구분을 선택해 주세요.");
  if (kind === "review" && (rating === null || !Number.isFinite(rating) || rating < .5 || rating > 5 || !Number.isInteger(rating * 2))) {
    throw new Error("별점은 0.5~5점 사이에서 0.5점 단위로 선택해 주세요.");
  }
  const methods = kind === "review" ? [...new Set(data.getAll("methods").map(String))] : [];
  const tags = [...new Set(data.getAll("tags").map(String))];
  if (methods.some((value) => !(drinkingMethods as readonly string[]).includes(value))
    || tags.some((value) => !(tasteTags as readonly string[]).includes(value))) throw new Error("마신 방법과 맛 태그를 다시 선택해 주세요.");
  if (kind === "curious" && tags.length) throw new Error("맛 태그는 마신 술 리뷰에만 추가할 수 있습니다.");
  const images = data.getAll("images").map(String);
  const imagePattern = new RegExp(`^${userId}/[0-9a-f-]{36}\\.(?:jpg|png|webp|gif)$`);
  if (images.length > maxDrinkPhotos || new Set(images).size !== images.length || images.some((path) => !imagePattern.test(path))) {
    throw new Error("사진은 본인이 업로드한 이미지로 최대 5장까지 등록해 주세요.");
  }
  return { name, body, category: category as DrinkCategory, kind: kind as DrinkKind, rating, methods, tags, images };
}
