import Link from "next/link";
import { Suspense } from "react";
import { ArrowUpRight, Bookmark, ChevronDown, House, Library, LogIn, MapPinned, Menu, Plane, PlaneTakeoff, Plus, ShoppingBag, Trophy, Utensils, Wine } from "lucide-react";
import { getSupabaseServerSession } from "@/lib/supabase/session";
import { isAdminUser } from "@/lib/admin";
import { loginHref } from "@/lib/returnTo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LogoutButton } from "@/components/LogoutButton";
import styles from "./Home.module.css";

const archiveLinks = [
  { href: "/", label: "모아보기", icon: House }, { href: "/reviews", label: "콘텐츠 리뷰", icon: Library },
  { href: "/watchlist/items", label: "기대작", icon: Bookmark }, { href: "/merchandise", label: "상품 리뷰", icon: ShoppingBag },
  { href: "/restaurants/items", label: "국내 맛집", icon: Utensils }, { href: "/restaurants/items?scope=overseas", label: "해외 맛집", icon: MapPinned },
  { href: "/travel/items", label: "해외여행", icon: Plane }, { href: "/drinks", label: "술 취향", icon: Wine },
];
const informationLinks = [
  { href: "/recommendations", label: "에디터 픽", icon: Bookmark }, { href: "/departures", label: "출국 안내", icon: PlaneTakeoff },
  { href: "/lck-calendar", label: "LCK 일정", icon: Trophy }, { href: "/lck-analysis", label: "LCK 분석", icon: Trophy },
];
async function currentUser() { try { return (await getSupabaseServerSession()).user; } catch { return null; } }
function NavigationLinks() {
  return <><nav className={styles.menuLinks} aria-label="기록 메뉴">{archiveLinks.map(({ href, label, icon: Icon }) => <Link prefetch={false} key={href} href={href} aria-current={href === "/" ? "page" : undefined}><Icon size={17} strokeWidth={1.6} aria-hidden="true" />{label}</Link>)}</nav>
    <div className={styles.information}><p>함께 보는 정보</p><nav className={styles.menuLinks} aria-label="정보 메뉴">{informationLinks.map(({ href, label, icon: Icon }) => <Link prefetch={false} key={href} href={href}><Icon size={17} strokeWidth={1.6} aria-hidden="true" />{label}</Link>)}</nav></div></>;
}
export function HomeSidebar() {
  return <><aside className={styles.sidebar} aria-label="사이트 메뉴"><Link prefetch={false} href="/" className={styles.brand}><Library size={24} strokeWidth={1.8} aria-hidden="true" /><span>취향 보관소</span></Link><NavigationLinks /><Suspense fallback={<div className={styles.profilePlaceholder} />}><HomeProfile /></Suspense></aside>
    <header className={styles.mobileHeader}><Link prefetch={false} href="/" className={styles.brand}><Library size={22} strokeWidth={1.8} aria-hidden="true" />취향 보관소</Link>
      <details className={styles.mobileMenu}><summary><Menu size={20} aria-hidden="true" /><span>메뉴</span></summary><div className={styles.mobileMenuPanel}><NavigationLinks /></div></details>
    </header></>;
}
async function HomeProfile() {
  const user = await currentUser();
  const name = user ? String(user.user_metadata?.nickname || user.user_metadata?.display_name || "내 계정").slice(0, 30) : "취향 보관소";
  return <Link prefetch={false} href={user ? "/account" : "/login"} className={styles.profile}><span className={styles.avatar} aria-hidden="true">{user ? name.slice(0, 1) : "S"}</span><span className={styles.profileName}>{name}<small>{user ? "내 계정" : "좋아하는 것을 기록하는 공간"}</small></span></Link>;
}
export async function HomeAccount() {
  const user = await currentUser();
  return <nav className={styles.account} aria-label="계정 메뉴"><ThemeToggle />
    <Link prefetch={false} href={user ? "/new" : loginHref("/new")} className={styles.primaryButton}><Plus size={16} aria-hidden="true" />새 기록</Link>
    {user ? <><details className={styles.accountMenu}><summary>내 계정<ChevronDown size={13} aria-hidden="true" /></summary><div><Link prefetch={false} href="/account">계정 설정<ArrowUpRight size={14} aria-hidden="true" /></Link><Link prefetch={false} href="/ai-office">AI Office<ArrowUpRight size={14} aria-hidden="true" /></Link><LogoutButton /></div></details>{isAdminUser(user) ? <Link prefetch={false} href="/admin" className={styles.adminLink}>관리자</Link> : null}</>
      : <Link prefetch={false} href="/login" className={styles.loginLink}><LogIn size={16} aria-hidden="true" /><span>로그인</span></Link>}
  </nav>;
}
export function HomeBottomNav() {
  return <nav className={styles.bottomNav} aria-label="모바일 바로가기">{[
    { href: "/", label: "홈", icon: House }, { href: "/reviews", label: "콘텐츠", icon: Library },
    { href: "/recommendations", label: "에디터픽", icon: Bookmark }, { href: "/departures", label: "출국안내", icon: PlaneTakeoff },
  ].map(({ href, label, icon: Icon }) => <Link prefetch={false} key={href} href={href} aria-current={href === "/" ? "page" : undefined}><Icon size={19} strokeWidth={1.6} aria-hidden="true" /><span>{label}</span></Link>)}</nav>;
}
