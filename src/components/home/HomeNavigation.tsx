import Link from "next/link";
import { Suspense } from "react";
import { ArrowUpRight, Library, LogIn, Plus } from "lucide-react";
import { getSupabaseServerSession } from "@/lib/supabase/session";
import { isAdminUser } from "@/lib/admin";
import { loginHref } from "@/lib/returnTo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LogoutButton } from "@/components/LogoutButton";
import styles from "./Home.module.css";
import { SiteNavigationLinks, SiteMobileMenu, SiteBottomNavigation, SidebarToggle, SiteAccountMenu } from "@/components/site/SiteNavigation";
import { getMemberProfile } from "@/data/memberProfile";
import { ProfileAvatar } from "@/components/account/ProfileAvatar";

async function currentUser() { try { return (await getSupabaseServerSession()).user; } catch { return null; } }
function NavigationLinks() { return <Suspense fallback={<div className={styles.navigationPlaceholder} />}><SiteNavigationLinks /></Suspense>; }
export function HomeSidebar() {
  return <><aside className={styles.sidebar} aria-label="사이트 메뉴"><div className={styles.sidebarBrand}><Link prefetch={false} href="/" aria-label="취향 보관소 홈" className={styles.brand}><Library size={24} strokeWidth={1.8} aria-hidden="true" /><span>취향 보관소</span></Link><SidebarToggle /></div><div id="site-sidebar-links"><NavigationLinks /></div><Suspense fallback={<div className={styles.profilePlaceholder} />}><HomeProfile /></Suspense></aside>
    <header className={styles.mobileHeader}><Link prefetch={false} href="/" aria-label="취향 보관소 홈" className={styles.brand}><Library size={22} strokeWidth={1.8} aria-hidden="true" />취향 보관소</Link>
      <SiteMobileMenu><NavigationLinks /></SiteMobileMenu>
    </header></>;
}
async function HomeProfile() {
  const user = await currentUser();
  const profile = user ? await getMemberProfile() : null;
  const name = user ? String(profile?.nickname || user.user_metadata?.nickname || user.user_metadata?.display_name || "마이페이지").slice(0, 30) : "취향 보관소";
  return <Link prefetch={false} href={user ? "/account" : "/login"} className={styles.profile}><ProfileAvatar src={profile?.photoUrl ?? null} name={name} size={32}/><span className={styles.profileName}>{name}<small>{user ? "마이페이지" : "좋아하는 것을 기록하는 공간"}</small></span></Link>;
}
export async function HomeAccount() {
  const user = await currentUser();
  return <nav className={styles.account} aria-label="계정 메뉴"><ThemeToggle />
    <Link prefetch={false} href={user ? "/new" : loginHref("/new")} className={styles.primaryButton}><Plus size={16} aria-hidden="true" />새 기록</Link>
    {user ? <><SiteAccountMenu><Link prefetch={false} href="/account">프로필·계정 설정<ArrowUpRight size={14} aria-hidden="true" /></Link>{isAdminUser(user) ? <Link prefetch={false} href="/admin" className={styles.mobileAdminItem}>관리자<ArrowUpRight size={14} aria-hidden="true" /></Link> : null}<Link prefetch={false} href="/ai-office">AI Office<ArrowUpRight size={14} aria-hidden="true" /></Link><LogoutButton /></SiteAccountMenu>{isAdminUser(user) ? <Link prefetch={false} href="/admin" className={styles.adminLink}>관리자</Link> : null}</>
      : <Link prefetch={false} href="/login" className={styles.loginLink}><LogIn size={16} aria-hidden="true" /><span>로그인</span></Link>}
  </nav>;
}
export function HomeBottomNav() { return <Suspense fallback={null}><SiteBottomNavigation /></Suspense>; }
