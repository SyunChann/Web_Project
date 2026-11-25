'use client';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useSyncExternalStore, type ReactNode } from 'react';
import { ArrowLeftRight, Bookmark, CalendarDays, ChartNoAxesCombined, House, Library, MapPinned, Menu, PanelLeftClose, PanelLeftOpen, Plane, PlaneTakeoff, ShoppingBag, Trophy, Utensils, Wine } from 'lucide-react';
import { archiveNavigation, informationNavigation, siteSection, siteSectionLabel, contentSections } from '@/lib/siteNavigation';
import styles from '@/components/home/Home.module.css';
const icons={ArrowLeftRight,Bookmark,CalendarDays,ChartNoAxesCombined,House,Library,MapPinned,Plane,PlaneTakeoff,ShoppingBag,Trophy,Utensils,Wine};
export function SiteNavigationLinks() {
  const path=usePathname();const scope=useSearchParams().get('scope') || '';const active=siteSection(path,scope);
  function links(items:readonly {href:string;label:string;icon:keyof typeof icons;key:string}[]) {return items.map(item=>{const Icon=icons[item.icon];return <Link prefetch={false} key={item.href} href={item.href} title={item.label} aria-current={active===item.key?'page':undefined}><Icon size={17} strokeWidth={1.6} aria-hidden="true"/><span className={styles.menuLabel}>{item.label}</span></Link>});}
  return <><nav className={styles.menuLinks} aria-label="기록 메뉴">{links(archiveNavigation)}</nav><div className={styles.information}><p>함께 보는 정보</p><nav className={styles.menuLinks} aria-label="정보 메뉴">{links(informationNavigation)}</nav></div></>;
}
export function SiteBreadcrumb() {const path=usePathname();const scope=useSearchParams().get('scope') || '';return <p className={styles.breadcrumb}><Link href="/">취향 보관소</Link> / {siteSectionLabel(path,scope)}</p>;}
export function SiteMobileMenu({children}:{children:ReactNode}) {const ref=useRef<HTMLDetailsElement>(null);return <details ref={ref} className={styles.mobileMenu} onClick={event=>{if((event.target as Element).closest('a')&&ref.current)ref.current.open=false;}}><summary><Menu size={20} aria-hidden="true"/><span>메뉴</span></summary><div className={styles.mobileMenuPanel}>{children}</div></details>;}
const key='archive-sidebar-collapsed';
let memoryCollapsed=false;
let storageUnavailable=false;
function snapshot(){if(storageUnavailable)return memoryCollapsed;try{return localStorage.getItem(key)===null?memoryCollapsed:localStorage.getItem(key)==='true';}catch{storageUnavailable=true;return memoryCollapsed;}}
function subscribe(callback:()=>void){window.addEventListener('storage',callback);window.addEventListener('archive-sidebar',callback);return()=>{window.removeEventListener('storage',callback);window.removeEventListener('archive-sidebar',callback);};}
export function SidebarToggle(){const collapsed=useSyncExternalStore(subscribe,snapshot,()=>false);useEffect(()=>{document.documentElement.dataset.sidebar=collapsed?'collapsed':'expanded';},[collapsed]);return <button type="button" className={styles.sidebarToggle} aria-label={collapsed?'사이드바 펼치기':'사이드바 접기'} aria-expanded={!collapsed} aria-controls="site-sidebar-links" onClick={()=>{memoryCollapsed=!collapsed;try{localStorage.setItem(key,String(!collapsed));}catch{storageUnavailable=true;}window.dispatchEvent(new Event('archive-sidebar'));}}>{collapsed?<PanelLeftOpen size={18}/>:<PanelLeftClose size={18}/>}</button>;}
export function SiteBottomNavigation(){const active=siteSection(usePathname(),useSearchParams().get('scope')||'');return <nav className={styles.bottomNav} aria-label="모바일 바로가기"><Link href="/" aria-current={active==='home'?'page':undefined}><House size={19}/><span>홈</span></Link><details className={styles.bottomGroup} onClick={event=>{if((event.target as Element).closest('a'))event.currentTarget.open=false;}}><summary aria-label="콘텐츠 메뉴" data-active={contentSections.includes(active)}><Library size={19}/><span>콘텐츠</span></summary><div>{[...archiveNavigation.filter(item=>contentSections.includes(item.key)),informationNavigation[3]].map(item=><Link key={item.href} href={item.href} aria-current={active===item.key?'page':undefined}>{item.label}</Link>)}</div></details><Link href="/recommendations" aria-current={active==='recommendations'?'page':undefined}><ShoppingBag size={19}/><span>쇼핑베스트</span></Link><Link href="/departures" aria-current={active==='departures'?'page':undefined}><PlaneTakeoff size={19}/><span>출국안내</span></Link></nav>;}
