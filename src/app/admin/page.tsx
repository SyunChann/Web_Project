import { headers } from "next/headers";
import { Suspense } from "react";
import { ArrowUpRight, FileWarning, ImageOff, KeyRound, MapPin, Pencil, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AppNav } from "@/components/AppNav";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { CopyButton } from "@/components/CopyButton";
import { createInviteCode, revokeInviteCode } from "./actions";
import { getAdminConfiguration, isAdminUser } from "@/lib/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAdminContent } from "@/data/admin";
import { adminContentMeta as contentMeta, adminContentIssues, type AdminContentKind, type AdminContentRow } from "@/lib/adminContent";
import { AdminServices } from "@/components/admin/AdminServices";
import { AdminApiStatus } from "@/components/admin/AdminApiStatus";

type AdminPageProps = {
  searchParams: Promise<{
    created?: string;
  }>;
};

type InviteCodeRow = {
  id: string;
  code: string;
  role: string;
  max_uses: number;
  used_count: number;
  expires_at: string;
  revoked_at: string | null;
  created_at: string;
};


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

function getInviteStatus(invite: InviteCodeRow, currentTime: number) {
  if (invite.revoked_at) {
    return {
      label: "폐기됨",
      className: "bg-[#eef0f3] text-[#52616b]",
    };
  }

  if (new Date(invite.expires_at).getTime() <= currentTime) {
    return {
      label: "만료됨",
      className: "bg-[#fde8e7] text-[#a73735]",
    };
  }

  if (invite.used_count >= invite.max_uses) {
    return {
      label: "사용 완료",
      className: "bg-[#fff0d9] text-[#a15c14]",
    };
  }

  return {
    label: "사용 가능",
    className: "bg-[#e4f4f2] text-[#2f7f7a]",
  };
}

function getInviteSummary(invites: InviteCodeRow[], currentTime: number) {
  return invites.reduce(
    (summary, invite) => {
      const isRevoked = Boolean(invite.revoked_at);
      const isExpired = new Date(invite.expires_at).getTime() <= currentTime;
      const isUsedUp = invite.used_count >= invite.max_uses;

      summary.total += 1;
      summary.used += invite.used_count;
      summary.capacity += invite.max_uses;

      if (isRevoked) {
        summary.revoked += 1;
      } else if (isExpired) {
        summary.expired += 1;
      } else if (isUsedUp) {
        summary.usedUp += 1;
      } else {
        summary.active += 1;
      }

      return summary;
    },
    {
      total: 0,
      active: 0,
      expired: 0,
      revoked: 0,
      usedUp: 0,
      used: 0,
      capacity: 0,
    },
  );
}

async function getOrigin() {
  const headerList = await headers();
  const host =
    headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "";
  const protocol = headerList.get("x-forwarded-proto") ?? "http";

  return host ? `${protocol}://${host}` : "";
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
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

  const { created } = await searchParams;
  const adminConfiguration = getAdminConfiguration();
  const origin = await getOrigin();
  const currentTime = new Date().getTime();
  const [inviteResult, contentResults] = await Promise.all([
    supabase.from("invite_codes")
      .select("id,code,role,max_uses,used_count,expires_at,revoked_at,created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .then((result) => result, () => ({ data: null, count: null, error: { message: "Invite query failed" } })),
    getAdminContent(supabase, user.id),
  ]);
  const { data, error } = inviteResult;
  const inviteCodes = (data ?? []) as InviteCodeRow[];
  const inviteSummary = getInviteSummary(inviteCodes, currentTime);
  const contentRows = contentResults.flatMap((result) => result.rows)
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
  const failedContent = contentResults.filter((result) => result.error);
  const totalContent = contentResults.reduce((sum, result) => sum + (result.count ?? 0), 0);
  const healthIssues = contentRows.flatMap((item) => adminContentIssues(item).map((issue) => ({ item, ...issue })));
  const createdUrl = created
    ? `${origin}/signup?invite=${encodeURIComponent(created)}`
    : null;


  return (
    <main className="min-h-screen px-4 py-6 pb-28 sm:px-10 sm:py-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
        <AppNav active="admin" />

        <section className="grid gap-3">
          <p className="text-sm font-semibold text-[#be4b49]">Admin</p>
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">관리자 홈</h1>
          <nav aria-label="관리자 섹션" className="flex flex-wrap gap-2">
            {[["#content", "콘텐츠"], ["#api-status", "외부 API 현황"], ["#services", "서비스·연동"], ["#invites", "초대 관리"]].map(([href, label]) => <Link key={href} href={href} className="inline-flex min-h-11 items-center rounded-md border border-[#d8cfc2] bg-white px-3 py-2 text-sm font-bold text-[#52616b]">{label}</Link>)}
          </nav>
          <p className="max-w-2xl leading-7 text-[#52616b]">
            콘텐츠 현황과 최근 글, 서비스 연동 설정, 초대 코드를 한곳에서 관리합니다.
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

        {createdUrl ? (
          <section className="rounded-lg border border-[#d8cfc2] bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-[#2f7f7a]">
              새 초대 URL이 생성되었습니다.
            </p>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row">
              <input
                readOnly
                value={createdUrl}
                className="min-w-0 flex-1 rounded-md border border-[#d8cfc2] bg-[#fbfaf7] px-4 py-3 text-sm outline-none"
              />
              <CopyButton value={createdUrl} label="URL 복사" />
            </div>
          </section>
        ) : null}

        <section id="invites" className="grid scroll-mt-6 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="sm:col-span-2 lg:col-span-5"><h2 className="text-2xl font-black">초대 관리</h2><p className="mt-2 text-sm leading-6 text-[#64748b]">{error ? "초대 정보를 불러오지 못했습니다. 다른 관리 기능은 계속 이용할 수 있습니다." : `전체 ${inviteResult.count ?? inviteCodes.length}개 중 조회한 ${inviteCodes.length}개 기준 통계입니다.`} 날짜는 한국 시간 기준입니다.</p></div>
          {!error ? <>
          <SummaryCard
            label="조회한 초대코드"
            value={inviteSummary.total}
            tone="default"
          />
          <SummaryCard
            label="사용 가능"
            value={inviteSummary.active}
            tone="green"
          />
          <SummaryCard
            label="사용 완료"
            value={inviteSummary.usedUp}
            tone="amber"
          />
          <SummaryCard
            label="만료"
            value={inviteSummary.expired}
            tone="red"
          />
          <SummaryCard
            label="폐기"
            value={inviteSummary.revoked}
            tone="gray"
          />
          <div className="rounded-lg border border-[#d8cfc2] bg-white p-5 shadow-sm sm:col-span-2 lg:col-span-5">
            <p className="text-sm font-bold text-[#52616b]">초대 사용 현황</p>
            <div className="mt-3 flex items-end justify-between gap-4">
              <p className="text-3xl font-black text-[#101820]">
                {inviteSummary.used}
                <span className="text-lg text-[#8b7460]">
                  {" "}
                  / {inviteSummary.capacity}
                </span>
              </p>
              <p className="text-sm font-bold text-[#7b8790]">
                누적 사용 / 총 사용 가능 횟수
              </p>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#f0e8de]">
              <div
                className="h-full rounded-full bg-[#be4b49]"
                style={{
                  width: `${
                    inviteSummary.capacity
                      ? Math.min(
                          100,
                          Math.round(
                            (inviteSummary.used / inviteSummary.capacity) * 100,
                          ),
                        )
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>
          </> : <p role="status" className="rounded-md bg-[#fff8ec] p-4 text-sm text-[#9a5a13]">초대 조회 실패 · 새로고침 후 다시 확인해 주세요.</p>}
        </section>

        <section className="rounded-lg border border-[#d8cfc2] bg-white p-5 shadow-sm">
          <h2 className="text-2xl font-black">초대 코드 생성</h2>
          <form
            action={createInviteCode}
            className="mt-5 grid items-end gap-4 lg:grid-cols-[minmax(280px,1fr)_180px_180px_110px]"
          >
            <label className="grid gap-2 text-sm font-bold">
              <span className="flex items-center gap-2">
                코드 직접 입력
                <span className="rounded bg-[#eee4d8] px-1.5 py-0.5 text-xs text-[#7d8790]">
                  선택
                </span>
              </span>
              <input
                name="code"
                type="text"
                placeholder="비워두면 자동 생성"
                maxLength={32}
                pattern="[A-Za-z0-9_-]{4,32}"
                className="rounded-md border border-[#d8cfc2] bg-[#fbfaf7] px-4 py-3 text-base font-normal uppercase outline-none transition focus:border-[#be4b49] focus:bg-white"
              />
            </label>

            <label className="grid gap-2 text-sm font-bold">
              사용 가능 횟수
              <input
                name="max_uses"
                type="number"
                min={1}
                max={50}
                defaultValue={1}
                className="rounded-md border border-[#d8cfc2] bg-[#fbfaf7] px-4 py-3 text-base font-normal outline-none transition focus:border-[#be4b49] focus:bg-white"
              />
            </label>

            <label className="grid gap-2 text-sm font-bold">
              만료일
              <select
                name="expires_in_days"
                defaultValue="7"
                className="rounded-md border border-[#d8cfc2] bg-[#fbfaf7] px-4 py-3 text-base font-normal outline-none transition focus:border-[#be4b49] focus:bg-white"
              >
                <option value="1">1일</option>
                <option value="3">3일</option>
                <option value="7">7일</option>
                <option value="30">30일</option>
              </select>
            </label>

            <button
              type="submit"
              disabled={Boolean(error)}
              className="h-[50px] rounded-md bg-[#be4b49] px-5 text-sm font-bold text-white shadow-sm transition hover:bg-[#a83f3d]"
            >
              생성
            </button>
          </form>
        </section>

        <section className="grid gap-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[#be4b49]">Invites</p>
              <h2 className="mt-2 text-2xl font-black">초대 코드 목록</h2>
            </div>
          </div>

          {error ? (
            <div className="rounded-lg border border-[#d8cfc2] bg-white p-6 text-[#52616b] shadow-sm">
              관리자 권한이 없거나 정책 설정이 아직 반영되지 않았습니다.
            </div>
          ) : inviteCodes.length ? (
            <div className="grid gap-3">
              {inviteCodes.map((invite) => {
                const status = getInviteStatus(invite, currentTime);
                const inviteUrl = `${origin}/signup?invite=${encodeURIComponent(
                  invite.code,
                )}`;
                const canRevoke = !invite.revoked_at;

                return (
                  <article
                    key={invite.id}
                    className="rounded-lg border border-[#d8cfc2] bg-white p-5 shadow-sm"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-xl font-black">{invite.code}</h3>
                          <span
                            className={`rounded-md px-2.5 py-1 text-xs font-black ${status.className}`}
                          >
                            {status.label}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-[#52616b]">
                          사용 {invite.used_count}/{invite.max_uses}회 · 만료{" "}
                          {formatDate(invite.expires_at)}
                        </p>
                        <input
                          readOnly
                          value={inviteUrl}
                          className="mt-4 w-full rounded-md border border-[#d8cfc2] bg-[#fbfaf7] px-4 py-3 text-sm outline-none"
                        />
                      </div>

                      <div className="flex w-full shrink-0 flex-wrap gap-2 sm:w-[164px] sm:justify-end">
                        <CopyButton value={inviteUrl} label="URL 복사" />
                        {canRevoke ? (
                          <form action={revokeInviteCode.bind(null, invite.id)}>
                            <ConfirmSubmitButton
                              triggerLabel="폐기"
                              title="초대 코드를 폐기할까요?"
                              description={`"${invite.code}" 초대 코드를 폐기합니다. 이미 공유한 가입 링크는 더 이상 사용할 수 없습니다.`}
                              confirmLabel="폐기"
                              triggerClassName="rounded-md border border-[#d8cfc2] bg-white px-3 py-2 text-sm font-bold text-[#a73735] shadow-sm transition hover:border-[#be4b49]"
                            />
                          </form>
                        ) : null}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="rounded-lg border border-[#d8cfc2] bg-white p-6 text-[#52616b] shadow-sm">
              아직 생성된 초대 코드가 없습니다.
            </div>
          )}
        </section>
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

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "default" | "green" | "amber" | "red" | "gray";
}) {
  const toneClasses = {
    default: "border-[#d8cfc2] bg-white text-[#101820]",
    green: "border-[#cbe8e4] bg-[#f4fbfa] text-[#2f7f7a]",
    amber: "border-[#f0ddbd] bg-[#fff8ec] text-[#9a5a13]",
    red: "border-[#f0c9c6] bg-[#fff5f3] text-[#a73735]",
    gray: "border-[#d9dee3] bg-[#f7f8f9] text-[#52616b]",
  };

  return (
    <article className={`rounded-lg border p-5 shadow-sm ${toneClasses[tone]}`}>
      <p className="text-sm font-bold opacity-80">{label}</p>
      <p className="mt-3 text-3xl font-black">{value}</p>
    </article>
  );
}
