import { headers } from "next/headers";
import { ArrowUpRight, FileWarning, ImageOff, MapPin, Pencil, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AppNav } from "@/components/AppNav";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { CopyButton } from "@/components/CopyButton";
import { createInviteCode, revokeInviteCode } from "./actions";
import { isAdminUser } from "@/lib/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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

type AdminContentKind = "review" | "watchlist" | "restaurant" | "travel";

type AdminContentRow = {
  id: string;
  kind: AdminContentKind;
  title: string;
  authorName: string | null;
  createdAt: string;
  thumbnail: string | null;
  summary: string | null;
  latitude: number | null;
  longitude: number | null;
};

type AdminSourceRow = {
  id: string;
  title: string;
  created_at: string;
  thumbnail: string | null;
  summary?: string | null;
  reason?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  author_name?: string | null;
};

const contentMeta: Record<AdminContentKind, { label: string; listHref: string; detailHref: (id: string) => string; editHref: (id: string) => string; tone: string }> = {
  review: { label: "리뷰", listHref: "/reviews", detailHref: (id) => `/reviews/${id}`, editHref: (id) => `/reviews/${id}/edit`, tone: "text-[#be4b49]" },
  watchlist: { label: "기대작", listHref: "/watchlist", detailHref: (id) => `/watchlist/${id}`, editHref: (id) => `/watchlist/${id}/edit`, tone: "text-[#2f7f7a]" },
  restaurant: { label: "맛집리뷰", listHref: "/restaurants/items", detailHref: (id) => `/restaurants/${id}`, editHref: (id) => `/restaurants/${id}/edit`, tone: "text-[#e57632]" },
  travel: { label: "해외여행", listHref: "/travel/items", detailHref: (id) => `/travel/${id}`, editHref: (id) => `/travel/${id}/edit`, tone: "text-[#4d7c0f]" },
};

function toAdminContentRows(kind: AdminContentKind, rows: AdminSourceRow[] | null) {
  return (rows ?? []).map((row) => ({
    id: row.id,
    kind,
    title: row.title,
    authorName: row.author_name ?? null,
    createdAt: row.created_at,
    thumbnail: row.thumbnail,
    summary: row.summary ?? row.reason ?? null,
    latitude: row.latitude ?? null,
    longitude: row.longitude ?? null,
  }));
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", { month: "short", day: "numeric" }).format(new Date(value));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
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
  const origin = await getOrigin();
  const currentTime = new Date().getTime();
  const { data, error } = await supabase
    .from("invite_codes")
    .select("id,code,role,max_uses,used_count,expires_at,revoked_at,created_at")
    .order("created_at", { ascending: false });
  const [reviewsResult, watchlistResult, restaurantsResult, travelResult] = await Promise.all([
    supabase.from("reviews").select("id,title,created_at,thumbnail,summary,author_name").order("created_at", { ascending: false }),
    supabase.from("watchlist_items").select("id,title,created_at,thumbnail,reason,author_name").order("created_at", { ascending: false }),
    supabase.from("restaurant_reviews").select("id,title,created_at,thumbnail,summary,latitude,longitude,author_name").order("created_at", { ascending: false }),
    supabase.from("travel").select("id,title,created_at,thumbnail,summary,latitude,longitude,author_name").order("created_at", { ascending: false }),
  ]);
  const inviteCodes = (data ?? []) as InviteCodeRow[];
  const inviteSummary = getInviteSummary(inviteCodes, currentTime);
  const contentRows = [
    ...toAdminContentRows("review", reviewsResult.data as AdminSourceRow[] | null),
    ...toAdminContentRows("watchlist", watchlistResult.data as AdminSourceRow[] | null),
    ...toAdminContentRows("restaurant", restaurantsResult.data as AdminSourceRow[] | null),
    ...toAdminContentRows("travel", travelResult.data as AdminSourceRow[] | null),
  ].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
  const contentCounts = contentRows.reduce<Record<AdminContentKind, number>>(
    (counts, item) => ({ ...counts, [item.kind]: counts[item.kind] + 1 }),
    { review: 0, watchlist: 0, restaurant: 0, travel: 0 },
  );
  const healthIssues = contentRows.flatMap((item) => {
    const issues: { label: string; icon: "image" | "location" | "content" }[] = [];

    if (!item.thumbnail?.trim()) issues.push({ label: "대표 이미지 없음", icon: "image" });
    if (!item.summary?.trim()) issues.push({ label: "요약 없음", icon: "content" });
    if ((item.kind === "restaurant" || item.kind === "travel") && (!item.latitude || !item.longitude)) {
      issues.push({ label: "장소 좌표 없음", icon: "location" });
    }

    return issues.map((issue) => ({ item, ...issue }));
  }).slice(0, 12);
  const createdUrl = created
    ? `${origin}/signup?invite=${encodeURIComponent(created)}`
    : null;

  if (error) {
    return (
      <main className="min-h-screen px-6 py-8 sm:px-10">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
          <AppNav active="admin" />

          <section className="grid gap-3">
            <p className="text-sm font-semibold text-[#be4b49]">Admin</p>
            <h1 className="text-4xl font-black tracking-tight">초대 관리</h1>
          </section>

          <section className="rounded-lg border border-[#d8cfc2] bg-white p-6 text-[#52616b] shadow-sm">
            관리자 권한이 없거나 정책 설정이 아직 반영되지 않았습니다.
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-6 py-8 sm:px-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
        <AppNav active="admin" />

        <section className="grid gap-3">
          <p className="text-sm font-semibold text-[#be4b49]">Admin</p>
          <h1 className="text-4xl font-black tracking-tight">초대 관리</h1>
          <p className="max-w-2xl leading-7 text-[#52616b]">
            초대 코드를 발급하고 가입 URL을 공유합니다. 초대받은 사용자는
            회원가입 후 리뷰와 기대작을 작성할 수 있습니다.
          </p>
        </section>

        <section className="grid gap-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 text-sm font-semibold text-[#2f7f7a]"><ShieldCheck size={16} /> Content operations</p>
              <h2 className="mt-2 text-2xl font-black">콘텐츠 관리</h2>
            </div>
            <p className="text-sm font-semibold text-[#64748b]">전체 {contentRows.length}개 기록</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {(Object.keys(contentMeta) as AdminContentKind[]).map((kind) => (
              <ContentCountCard key={kind} kind={kind} count={contentCounts[kind]} />
            ))}
          </div>

          <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
            <section className="border-t border-[#d8cfc2] pt-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-black">최근 등록 콘텐츠</h3>
                <span className="text-sm font-semibold text-[#64748b]">최근 8개</span>
              </div>
              <div className="mt-3 divide-y divide-[#e7eeed] rounded-lg border border-[#d8cfc2] bg-white shadow-sm">
                {contentRows.slice(0, 8).map((item) => <ContentManagementRow key={`${item.kind}-${item.id}`} item={item} />)}
                {!contentRows.length ? <p className="p-5 text-sm text-[#64748b]">아직 등록된 콘텐츠가 없습니다.</p> : null}
              </div>
            </section>

            <section className="border-t border-[#d8cfc2] pt-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="flex items-center gap-2 text-lg font-black"><FileWarning size={18} className="text-[#b45309]" />데이터 점검</h3>
                <span className="rounded-md bg-[#fff4da] px-2 py-1 text-xs font-black text-[#9a5a13]">{healthIssues.length}건</span>
              </div>
              <div className="mt-3 divide-y divide-[#f0e5d5] rounded-lg border border-[#f0ddbd] bg-[#fffdf8] shadow-sm">
                {healthIssues.map((issue) => <DataHealthRow key={`${issue.item.kind}-${issue.item.id}-${issue.label}`} item={issue.item} label={issue.label} icon={issue.icon} />)}
                {!healthIssues.length ? <p className="p-5 text-sm font-semibold text-[#2f7f7a]">점검이 필요한 콘텐츠가 없습니다.</p> : null}
              </div>
            </section>
          </div>
        </section>

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

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <SummaryCard
            label="전체 초대코드"
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

function ContentCountCard({ kind, count }: { kind: AdminContentKind; count: number }) {
  const meta = contentMeta[kind];

  return (
    <Link href={meta.listHref} className="rounded-lg border border-[#d8cfc2] bg-white p-5 shadow-sm transition hover:border-[#8fc9c4] hover:shadow-md">
      <p className={`text-sm font-bold ${meta.tone}`}>{meta.label}</p>
      <div className="mt-3 flex items-end justify-between gap-3">
        <p className="text-3xl font-black text-[#17202a]">{count}</p>
        <ArrowUpRight size={18} className="text-[#8a95a1]" />
      </div>
    </Link>
  );
}

function ContentManagementRow({ item }: { item: AdminContentRow }) {
  const meta = contentMeta[item.kind];

  return (
    <article className="flex items-center justify-between gap-3 p-4">
      <Link href={meta.detailHref(item.id)} className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-black ${meta.tone}`}>{meta.label}</span>
          <span className="text-xs font-semibold text-[#94a3b8]">{formatShortDate(item.createdAt)}</span>
        </div>
        <h4 className="mt-1 truncate font-bold text-[#17202a]">{item.title}</h4>
        <p className="mt-1 text-xs text-[#64748b]">{item.authorName ?? "작성자 없음"}</p>
      </Link>
      <Link href={meta.editHref(item.id)} className="inline-flex shrink-0 items-center justify-center rounded-md border border-[#d8cfc2] bg-white p-2 text-[#52616b] transition hover:border-[#2f7f7a] hover:text-[#2f7f7a]" aria-label={`${item.title} 수정`}>
        <Pencil size={16} />
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
      <Link href={meta.editHref(item.id)} className="inline-flex shrink-0 items-center gap-1 rounded-md border border-[#e2c17f] bg-white px-2.5 py-2 text-xs font-bold text-[#9a5a13] transition hover:border-[#d49a35] hover:bg-[#fff4da]">
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
