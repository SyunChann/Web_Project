export type SharelinkEditorialPost = {
  slug: string;
  kind: "guide" | "product-review";
  eyebrow: string;
  title: string;
  summary: string;
  paragraphs: string[];
  checklist: string[];
  publishedAt: string;
  product?: {
    tacaItemId: number;
    imageApproved: boolean;
    imageApprovalNote?: string;
  };
};

// 상품 후기를 추가할 때는 실제 사용 경험을 작성하고, 토스에서 이미지 사용 범위를
// 확인한 상품에만 product.imageApproved를 true로 설정합니다.
export const featuredSharelinkPost: SharelinkEditorialPost = {
  slug: "everyday-pick",
  kind: "guide",
  eyebrow: "EDITOR'S PICK",
  title: "매일 쓰는 물건을 고를 때 확인한 세 가지",
  summary: "매일 사용하는 물건을 고를 때 놓치지 않는 기준을 정리했습니다.",
  paragraphs: [
    "매일 손이 가는 물건일수록 기능이 많다는 이유만으로 고르기보다, 보관하기 편한지와 관리가 쉬운지를 먼저 살펴봅니다.",
    "앞으로의 상품 추천도 사용 빈도, 관리 부담, 가격 대비 활용도를 기준으로 하나씩 자세히 살펴보려고 합니다.",
  ],
  checklist: ["일상에서 자주 사용할 수 있는가", "보관과 관리가 번거롭지 않은가", "가격에 비해 활용 기간이 충분한가"],
  publishedAt: "2026-09-23",
};

export const sharelinkEditorialPosts: SharelinkEditorialPost[] = [featuredSharelinkPost];

export function getPublishedSharelinkPosts() {
  return [...sharelinkEditorialPosts].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

export function getSharelinkEditorialPost(slug: string) {
  return sharelinkEditorialPosts.find((post) => post.slug === slug);
}

export function getSharelinkPostByTacaItemId(tacaItemId: number) {
  return sharelinkEditorialPosts.find((post) => post.product?.tacaItemId === tacaItemId);
}
