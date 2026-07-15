import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query");

  if (!query) {
    return NextResponse.json({ items: [] });
  }

  const clientId = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID;
  const clientSecret = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error("네이버 API 환경 변수가 설정되지 않았습니다.");
    return NextResponse.json(
      { error: "서버 설정 오류가 발생했습니다." },
      { status: 500 }
    );
  }

  try {
    // 네이버 지역 검색 API 호출 (최대 5개 결과 검색)
    const response = await fetch(
      `https://openapi.naver.com/v1/search/local.json?query=${encodeURIComponent(query)}`,
      {
        headers: {
          "X-Naver-Client-Id": clientId,
          "X-Naver-Client-Secret": clientSecret,
        },
      }
    );
    console.log(response.status);
console.log(response.ok);

    if (!response.ok) {
      throw new Error(`네이버 API 응답 에러: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("네이버 검색 중 요류:", error);
    return NextResponse.json(
      { error: "검색 결과를 불러오는 데 실패했습니다." },
      { status: 500 }
    );
  }
}