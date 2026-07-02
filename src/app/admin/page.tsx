import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AppNav } from "@/components/AppNav";
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

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(value));
}

function getInviteStatus(invite: InviteCodeRow) {
  if (invite.revoked_at) {
    return {
      label: "폐기됨",
      className: "bg-[#eef0f3] text-[#52616b]",
    };
  }

  if (new Date(invite.expires_at).getTime() <= Date.now()) {
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
  const { data, error } = await supabase
    .from("invite_codes")
    .select("id,code,role,max_uses,used_count,expires_at,revoked_at,created_at")
    .order("created_at", { ascending: false });
  const inviteCodes = (data ?? []) as InviteCodeRow[];
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
                className="rounded-md border border-[#d8cfc2] bg-[#fbfaf7] px-4 py-3 text-base font-normal uppercase outline-none transition focus:border-[#be4b49] focus:bg-white"
              />
            </label>

            <label className="grid gap-2 text-sm font-bold">
              사용 가능 횟수
              <input
                name="max_uses"
                type="number"
                min={1}
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
                const status = getInviteStatus(invite);
                const inviteUrl = `${origin}/signup?invite=${encodeURIComponent(
                  invite.code,
                )}`;
                const canRevoke =
                  !invite.revoked_at &&
                  new Date(invite.expires_at).getTime() > Date.now();

                return (
                  <article
                    key={invite.id}
                    className="rounded-lg border border-[#d8cfc2] bg-white p-5 shadow-sm"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
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

                      <div className="flex flex-wrap gap-2">
                        <CopyButton value={inviteUrl} label="URL 복사" />
                        {canRevoke ? (
                          <form action={revokeInviteCode.bind(null, invite.id)}>
                            <button
                              type="submit"
                              className="rounded-md border border-[#d8cfc2] bg-white px-3 py-2 text-sm font-bold text-[#a73735] shadow-sm transition hover:border-[#be4b49]"
                            >
                              폐기
                            </button>
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
