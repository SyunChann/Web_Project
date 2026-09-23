export type SharelinkEditorialPost = {
  slug: string;
  eyebrow: string;
  title: string;
  summary: string;
  paragraphs: string[];
  checklist: string[];
};

// 상품을 검색·나열하는 피드가 아니라, 직접 작성한 한 편의 추천 게시글로 운영합니다.
export const featuredSharelinkPost: SharelinkEditorialPost = {
  slug: "everyday-pick",
  eyebrow: "EDITOR'S PICK",
  title: "매일 쓰는 물건을 고를 때 확인한 세 가지",
  summary: "매일 사용하는 물건을 고를 때 놓치지 않는 기준을 정리했습니다.",
  paragraphs: [
    "매일 손이 가는 물건일수록 기능이 많다는 이유만으로 고르기보다, 보관하기 편한지와 관리가 쉬운지를 먼저 살펴봅니다.",
    "앞으로의 상품 추천도 사용 빈도, 관리 부담, 가격 대비 활용도를 기준으로 하나씩 자세히 살펴보려고 합니다.",
  ],
  checklist: ["일상에서 자주 사용할 수 있는가", "보관과 관리가 번거롭지 않은가", "가격에 비해 활용 기간이 충분한가"],
};
