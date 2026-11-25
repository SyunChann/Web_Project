export const archiveNavigation = [
  {href:'/',label:'모아보기',icon:'House',key:'home'},
  {href:'/reviews',label:'콘텐츠 리뷰',icon:'Library',key:'reviews'},
  {href:'/watchlist/items',label:'기대작',icon:'Bookmark',key:'watchlist'},
  {href:'/merchandise',label:'상품 리뷰',icon:'ShoppingBag',key:'merchandise'},
  {href:'/restaurants/items',label:'국내 맛집',icon:'Utensils',key:'restaurants'},
  {href:'/restaurants/items?scope=overseas',label:'해외 맛집',icon:'MapPinned',key:'overseas'},
  {href:'/travel/items',label:'해외여행',icon:'Plane',key:'travel'},
  {href:'/drinks',label:'술 취향',icon:'Wine',key:'drinks'},
] as const;
export const informationNavigation = [
  {href:'/recommendations',label:'쇼핑 베스트',icon:'ShoppingBag',key:'recommendations'},
  {href:'/departures',label:'출국 안내',icon:'PlaneTakeoff',key:'departures'},
  {href:'/exchange-rates',label:'환율 안내',icon:'ArrowLeftRight',key:'exchange-rates'},
  {href:'/release-calendar',label:'애니 신작',icon:'CalendarDays',key:'release-calendar'},
  {href:'/lck-calendar',label:'LCK 일정',icon:'Trophy',key:'lck-calendar'},
  {href:'/lck-analysis',label:'LCK 분석',icon:'ChartNoAxesCombined',key:'lck-analysis'},
] as const;
export function siteSection(path: string, scope = '') {
  if(path==='/')return 'home';
  if(path.startsWith('/restaurants'))return scope==='overseas'||path.includes('/overseas')?'overseas':'restaurants';
  return path.split('/')[1] || 'home';
}
export function siteSectionLabel(path:string,scope='') {
  const key=siteSection(path,scope);
  return [...archiveNavigation,...informationNavigation].find(item=>item.key===key)?.label
    || ({account:'마이페이지',admin:'관리자',new:'새 기록',login:'로그인',signup:'회원가입','forgot-password':'비밀번호 찾기','reset-password':'비밀번호 재설정','change-password':'비밀번호 변경','password-complete':'비밀번호 변경 완료','confirm-email':'이메일 인증',terms:'이용약관',privacy:'개인정보 안내',prices:'가격 관심 목록','ai-office':'AI Office'} as Record<string,string>)[key] || '취향 보관소';
}
export const contentSections = ['reviews','watchlist','merchandise','drinks','release-calendar'];
