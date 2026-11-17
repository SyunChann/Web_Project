# 취향 보관소

좋아하는 콘텐츠, 맛집, 여행과 술을 기록하는 공간입니다.

[사이트 열기](https://web-project-omega-ruby-60.vercel.app)

<p align="center">
  <img src="public/thumbnails/Screenshot%202026-07-17%20at%2005.25.51.png" alt="취향 보관소 메인 화면" width="960" />
</p>

## 주요 기능

- **취향 기록** — 콘텐츠 리뷰, 기대작, 상품 리뷰.
- **맛집·여행** — 국내외 맛집, 지도, 여행 동선.
- **술 취향** — 시음 후기, 궁금한 술, 반 별 평점, 사진과 맛 태그.
- **출국 안내** — 인천공항 출국장 혼잡도와 일본행 항공편.
- **생활 정보** — 환율, 추천 상품, 공개 일정과 LCK 캘린더.
- **계정·관리** — 초대 가입, 비밀번호 찾기·변경, 관리자 홈.

## 기술

Next.js 16 · React 19 · TypeScript · Tailwind CSS 4 · Supabase · Vercel

## 로컬 실행

Node.js 24.22.1 이상, 25 미만을 사용합니다.

```bash
npm install
cp .env.example .env.local
npm run dev
```

환경변수를 입력한 뒤 [localhost:4281](http://localhost:4281)에서 확인합니다.
DB와 외부 서비스 설정은 [설정 가이드](docs/SETUP.md)를 참고하세요.

## 확인

```bash
npx tsc --noEmit
npm run lint
npm run build
```

main 브랜치에 푸시하면 Vercel에서 자동 배포됩니다.
