"use client";

import Image from "next/image";
import Link from "next/link";
import { useId, useState } from "react";
import { ArrowUpRight, Library, MapPinned, Plane, Star, Wine } from "lucide-react";
import type { HomeEntry, HomeGroup } from "@/data/homeFeed";
import styles from "./Home.module.css";

const filters: { value: HomeGroup | "all"; label: string; href: string }[] = [
  { value: "all", label: "전체", href: "/reviews" }, { value: "content", label: "콘텐츠", href: "/reviews" },
  { value: "restaurants", label: "맛집", href: "/restaurants/items" }, { value: "travel", label: "여행", href: "/travel/items" }, { value: "drinks", label: "술", href: "/drinks" },
];
const icons = { content: Library, restaurants: MapPinned, travel: Plane, drinks: Wine };
function EntryPhoto({ entry }: { entry: HomeEntry }) {
  const [failed, setFailed] = useState<string | null>(null);
  const Icon = icons[entry.group];
  return <span className={styles.thumbnail}>
    {entry.image && failed !== entry.image ? <Image src={entry.image} alt="" width={120} height={144} sizes="60px" className={styles.photo} unoptimized={/\.gif(?:\?|$)/i.test(entry.image)} onError={() => setFailed(entry.image)} /> : <Icon size={22} strokeWidth={1.5} aria-hidden="true" />}
  </span>;
}
export function HomeRecentEntries({ entries, partial = false }: { entries: HomeEntry[]; partial?: boolean }) {
  const [selected, setSelected] = useState<HomeGroup | "all">("all");
  const id = useId();
  const visible = entries.filter((entry) => selected === "all" || entry.group === selected).slice(0, 5);
  const current = filters.find((filter) => filter.value === selected)!;
  return <section className={styles.recent} aria-labelledby={`${id}-heading`}>
    <div className={styles.sectionHeader}><h2 id={`${id}-heading`}>최근 남긴 기록</h2><Link prefetch={false} href={current.href} className={styles.textLink}>목록 보기 <ArrowUpRight size={14} aria-hidden="true" /></Link></div>
    <div className={styles.tabs} role="tablist" aria-label="기록 종류">
      {filters.map((filter, index) => <button key={filter.value} id={`${id}-${filter.value}`} type="button" role="tab" aria-selected={selected === filter.value} aria-controls={`${id}-entries`} tabIndex={selected === filter.value ? 0 : -1}
        onClick={() => setSelected(filter.value)} onKeyDown={(event) => {
          if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
          event.preventDefault();
          const next = event.key === "Home" ? 0 : event.key === "End" ? filters.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + filters.length) % filters.length;
          setSelected(filters[next].value); document.getElementById(`${id}-${filters[next].value}`)?.focus();
        }}>{filter.label}</button>)}
    </div>
    <div id={`${id}-entries`} role="tabpanel" aria-labelledby={`${id}-${selected}`} aria-live="polite" className={styles.entries}>
      {visible.length ? visible.map((entry) => <article className={styles.entry} key={entry.id}>
        <Link prefetch={false} href={entry.href} className={styles.entryLink}>
          <EntryPhoto entry={entry} />
          <div className={styles.entryBody}><p className={styles.entryLabel}>{entry.label}{entry.detail ? ` · ${entry.detail}` : ""}</p><h3>{entry.title}</h3>
            <div className={styles.entryMeta}>{entry.rating !== null ? <span className={styles.rating}><Star size={12} fill="currentColor" aria-hidden="true" /><span className="sr-only">평점 </span>{entry.rating.toFixed(1)}</span> : null}
              <time dateTime={entry.createdAt}>{new Intl.DateTimeFormat("ko-KR", { month: "numeric", day: "numeric", timeZone: "Asia/Seoul" }).format(new Date(entry.createdAt))}</time>
            </div>
          </div><ArrowUpRight size={17} className={styles.entryArrow} aria-hidden="true" />
        </Link>
      </article>) : <p className={styles.empty}>{partial ? "기록을 불러오지 못했습니다. 각 목록에서 다시 확인해 주세요." : "아직 등록된 기록이 없습니다."}</p>}
    </div>
    {partial && visible.length ? <p className={styles.feedNotice}>일부 기록을 불러오지 못했습니다. 각 목록에서 확인해 주세요.</p> : null}
  </section>;
}
