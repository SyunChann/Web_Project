import { Suspense } from "react";
import { ArrowUpRight, FileWarning, ImageOff, KeyRound, MapPin, Pencil, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AppNav } from "@/components/AppNav";
import { getAdminConfiguration, isAdminUser } from "@/lib/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAdminContent } from "@/data/admin";
import { adminContentMeta as contentMeta, adminContentIssues, type AdminContentKind, type AdminContentRow } from "@/lib/adminContent";
import { AdminServices } from "@/components/admin/AdminServices";
import { AdminApiStatus } from "@/components/admin/AdminApiStatus";

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "short", day: "numeric" }).format(new Date(value));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

export default async function AdminPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

  if (!user) {
    redirect("/login");
  }

  if (!isAdminUser(user)) {
    redirect("/");
  }

  if (!supabase) {
    redirect("/login?error=config");
  }

  const adminConfiguration = getAdminConfiguration();
  const currentTime = new Date().getTime();
  const contentResults = await getAdminContent(supabase, user.id);
  const contentRows = contentResults.flatMap((result) => result.rows)
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
  const failedContent = contentResults.filter((result) => result.error);
  const totalContent = contentResults.reduce((sum, result) => sum + (result.count ?? 0), 0);
  const healthIssues = contentRows.flatMap((item) => adminContentIssues(item).map((issue) => ({ item, ...issue })));

  return (
    <main className="min-h-screen px-4 py-6 pb-28 sm:px-10 sm:py-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
        <AppNav active="admin" />

        <section className="grid gap-3">
          <p className="text-sm font-semibold text-[#be4b49]">Admin</p>
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">관리자 홈</h1>
          <nav aria-label="관리자 섹션" className="flex flex-wrap gap-2">
            {[["#content", "콘텐츠"], ["#api-status", "외부 API 현황"], ["#services", "서비스·연동"]].map(([href, label]) => <Link key={href} href={href} className="inline-flex min-h-11 items-center rounded-md border border-[#d8cfc2] bg-white px-3 py-2 text-sm font-bold text-[#52616b]">{label}</Link>)}
          </nav>
          <p className="max-w-2xl leading-7 text-[#52616b]">
            콘텐츠 현황과 최근 글, 서비스 연동 상태를 확인합니다.
            <span className="mt-1 block text-xs">조회 {formatDate(new Date(currentTime).toISOString())} KST · 콘텐츠 건수는 기록 단위입니다.</span>
          </p>
        </section>

        <section className="rounded-lg border border-[#cbe8e4] bg-[#f4fbfa] p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="flex items-center gap-2 text-sm font-bold text-[#2f7f7a]">
                <KeyRound size={16} /> 관리자 계정
              </p>
              <p className="mt-2 break-all text-lg font-black text-[#17202a]">{user.email}</p>
              <p className="mt-1 text-sm leading-6 text-[#52616b]">
                현재 로그인한 계정이며 <code className="rounded bg-white px-1.5 py-0.5 font-bold">ADMIN_EMAILS</code>에 등록되어 있습니다.
              </p>
            </div>
            <div className="rounded-md border border-[#cbe8e4] bg-white px-4 py-3 sm:max-w-sm">
              <p className="text-xs font-black text-[#2f7f7a]">등록된 관리자 이메일</p>
              <ul className="mt-2 grid gap-1 text-sm font-semibold text-[#3f4a54]">
                {adminConfiguration.emails.map((email) => <li key={email} className="break-all">{email}</li>)}
              </ul>
              {adminConfiguration.source === "development-fallback" ? (
                <p className="mt-2 text-xs text-[#8b7460]">로컬 개발 기본값을 사용 중입니다.</p>
              ) : null}
            </div>
          </div>
        </section>

        <section id="content" className="grid scroll-mt-6 gap-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 text-sm font-semibold text-[#2f7f7a]"><ShieldCheck size={16} /> Content operations</p>
              <h2 className="mt-2 text-2xl font-black">콘텐츠 관리</h2>
            </div>
            <p className="text-sm font-semibold text-[#64748b]">{failedContent.length ? "조회 성공 분류 " : "전체 "}{totalContent}개 기록</p>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {contentResults.map((result) => <ContentCountCard key={result.kind} kind={result.kind} count={result.count} />)}
          </div>
          {failedContent.length ? <p role="status" className="rounded-md border border-[#f0ddbd] bg-[#fff8ec] p-4 text-sm leading-6 text-[#9a5a13]">{failedContent.map((result) => contentMeta[result.kind].label).join(" · ")} 정보를 불러오지 못했습니다. 해당 분류의 건수와 최근 글은 제외했습니다.</p> : null}

          <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
            <section className="border-t border-[#d8cfc2] pt-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-black">최근 등록 콘텐츠</h3>
                <span className="text-sm font-semibold text-[#64748b]">최근 8개</span>
              </div>
              <div className="mt-3 divide-y divide-[#e7eeed] rounded-lg border border-[#d8cfc2] bg-white shadow-sm">
                {contentRows.slice(0, 8).map((item) => <ContentManagementRow key={`${item.kind}-${item.id}`} item={item} />)}
                {!contentRows.length ? <p className="p-5 text-sm text-[#64748b]">{failedContent.length ? "조회 가능한 최근 콘텐츠가 없습니다." : "아직 등록된 콘텐츠가 없습니다."}</p> : null}
              </div>
            </section>

            <section className="border-t border-[#d8cfc2] pt-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="flex items-center gap-2 text-lg font-black"><FileWarning size={18} className="text-[#b45309]" />콘텐츠 보완 안내</h3>
                <span className="rounded-md bg-[#fff4da] px-2 py-1 text-xs font-black text-[#9a5a13]">{healthIssues.length}건</span>
              </div>
              <p className="mt-2 text-xs leading-5 text-[#64748b]">분류별 최근 8개 기준 · 최대 12개 안내 표시. 선택 사진이 없는 술 글은 보완 대상으로 분류하지 않습니다.</p>
              <div className="mt-3 divide-y divide-[#f0e5d5] rounded-lg border border-[#f0ddbd] bg-[#fffdf8] shadow-sm">
                {healthIssues.slice(0, 12).map((issue) => <DataHealthRow key={`${issue.item.kind}-${issue.item.id}-${issue.label}`} item={issue.item} label={issue.label} icon={issue.icon} />)}
                {!healthIssues.length ? <p className="p-5 text-sm font-semibold text-[#2f7f7a]">조회한 최근 콘텐츠에 보완 안내가 없습니다.</p> : null}
              </div>
            </section>
          </div>
        </section>

        <Suspense fallback={<section id="api-status" role="status" className="rounded-lg border bg-white p-5">외부 API 운영 기록을 불러오고 있습니다…</section>}><AdminApiStatus user={user} now={currentTime} /></Suspense>
        <AdminServices />

      </div>
    </main>
  );
}

function ContentCountCard({ kind, count }: { kind: AdminContentKind; count: number | null }) {
  const meta = contentMeta[kind];

  return (
    <Link href={meta.listHref} className="rounded-lg border border-[#d8cfc2] bg-white p-5 shadow-sm transition hover:border-[#8fc9c4] hover:shadow-md">
      <p className={`text-sm font-bold ${meta.tone}`}>{meta.label}</p>
      <div className="mt-3 flex items-end justify-between gap-3">
        <p className="text-3xl font-black text-[#17202a]">{count ?? "—"}</p>
        <ArrowUpRight size={18} className="text-[#8a95a1]" />
      </div>
    </Link>
  );
}

function ContentManagementRow({ item }: { item: AdminContentRow }) {
  const meta = contentMeta[item.kind];

  return (
    <article className="flex items-center justify-between gap-3 p-4">
      <Link href={`${meta.base}/${item.id}`} className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-black ${meta.tone}`}>{meta.label}</span>
          <span className="text-xs font-semibold text-[#94a3b8]">{formatShortDate(item.createdAt)}</span>
        </div>
        <h4 className="mt-1 truncate font-bold text-[#17202a]">{item.title}</h4>
        <p className="mt-1 text-xs text-[#64748b]">{item.authorName ?? "작성자 없음"}</p>
      </Link>
      <Link href={`${meta.base}/${item.id}${item.canEdit ? "/edit" : ""}`} className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-md border border-[#d8cfc2] bg-white p-2 text-[#52616b] transition hover:border-[#2f7f7a] hover:text-[#2f7f7a]" aria-label={`${item.title} ${item.canEdit ? "수정" : "보기"}`}>
        {item.canEdit ? <Pencil size={16} /> : <ArrowUpRight size={16} />}
      </Link>
    </article>
  );
}

function DataHealthRow({ item, label, icon }: { item: AdminContentRow; label: string; icon: "image" | "location" | "content" }) {
  const meta = contentMeta[item.kind];
  const Icon = icon === "image" ? ImageOff : icon === "location" ? MapPin : FileWarning;

  return (
    <article className="flex items-center justify-between gap-3 p-4">
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 text-xs font-black text-[#9a5a13]"><Icon size={14} />{label}</p>
        <p className="mt-1 truncate text-sm font-bold text-[#17202a]">{item.title}</p>
        <p className={`mt-1 text-xs font-semibold ${meta.tone}`}>{meta.label}</p>
      </div>
      <Link href={`${meta.base}/${item.id}${item.canEdit ? "/edit" : ""}`} className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-md border border-[#e2c17f] bg-white px-2.5 py-2 text-xs font-bold text-[#9a5a13] transition hover:border-[#d49a35] hover:bg-[#fff4da]">
        수정
        <ArrowUpRight size={14} />
      </Link>
    </article>
  );
}
