"use server";

export type NaverProductItem = {
  productId: string;
  title: string;
  lprice: string;
  image: string;
  mallName: string;
  link: string;
};

export async function searchNaverProducts(query: string): Promise<NaverProductItem[]> {
  if (!query.trim()) {
    return [];
  }

  // Vercel 환경변수에서 안전하게 키를 꺼냄 (브라우저 노출 0%)
  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error("네이버 API 키가 설정되지 않았습니다.");
    return [];
  }

  try {
    const response = await fetch(
      `https://openapi.naver.com/v1/search/shop.json?query=${encodeURIComponent(query)}&display=5&sort=sim`,
      {
        headers: {
          "X-Naver-Client-Id": clientId,
          "X-Naver-Client-Secret": clientSecret,
        },
        // 1시간(3600초) 동안 동일한 검색어 결과는 캐싱하여 무료 한도 아끼기
        next: { revalidate: 3600 },
      }
    );

    if (!response.ok) {
      throw new Error(`네이버 API 통신 오류: ${response.status}`);
    }

    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error("상품 검색 실패:", error);
    return [];
  }
}