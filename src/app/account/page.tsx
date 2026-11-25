import { loginHref } from "@/lib/returnTo";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AppNav } from "@/components/AppNav";
import { getSupabaseServerSession } from "@/lib/supabase/session";
import { isAdminUser } from "@/lib/admin";
import { membershipErrors } from "@/lib/membership";
import { Captcha } from "@/components/auth/Captcha";
import { changeNickname, withdrawAccount } from "./actions";
import { getMemberProfile, getMemberActivity } from '@/data/memberProfile';
import { ProfileAvatar } from '@/components/account/ProfileAvatar';
import { ProfileEditor } from '@/components/account/ProfileEditor';
import styles from '@/components/account/Account.module.css';
export const metadata: Metadata = { title: "마이페이지 | 취향보관소", robots: { index: false, follow: false } };
const field = styles.input;
export default async function AccountPage({ searchParams }: { searchParams: Promise<{ error?: string; status?: string }> }) {
  const { supabase, user } = await getSupabaseServerSession();
  if (!supabase || !user) redirect(loginHref("/account"));
  const [profile, activity] = await Promise.all([getMemberProfile(), getMemberActivity()]);
  const recent = activity.flatMap(item=>item.records).sort((a,b)=>Date.parse(b.date)-Date.parse(a.date)).slice(0,3);
  const total = activity.reduce((sum,item)=>sum+(item.count ?? 0),0);
  const partial = activity.some(item=>item.count===null);
  const nickname = profile?.nickname || String(user.user_metadata?.nickname || '회원');
  const formatDate = (value: string) => new Intl.DateTimeFormat('ko-KR',{year:'numeric',month:'long',day:'numeric',timeZone:'Asia/Seoul'}).format(new Date(value));
  const { error, status } = await searchParams;
  const errors: Record<string, string> = { ...membershipErrors, nickname: isAdminUser(user) ? "닉네임은 한글·영문·숫자·_·- 조합으로 2~16자 입력해 주세요. 탈퇴 전용 이름은 사용할 수 없습니다." : membershipErrors.nickname, save: "계정 정보를 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.", current: "현재 비밀번호를 확인해 주세요.", admin: "관리자 계정은 여기서 탈퇴할 수 없습니다.", confirm: "현재 비밀번호와 확인 문구 ‘탈퇴’를 입력해 주세요." };
  return <main className="min-h-screen px-4 py-6 pb-28 sm:px-10"><div className="mx-auto max-w-6xl"><AppNav /><section className={styles.page}><h1 className={styles.heading}>마이페이지</h1>
    {error ? <p role="alert" className={styles.notice}>{errors[error] ?? errors.save}</p> : null}
    {status === "saved" ? <p role="status" className={styles.notice}>닉네임을 변경했습니다. 기존 글의 작성자 표시에도 반영됩니다.</p> : null}
    <div className={styles.grid}><div className={styles.column}>
      <section className={styles.panel} aria-label="내 프로필"><div className={styles.identity}><ProfileAvatar src={profile?.photoUrl ?? null} name={nickname}/><div><h2>{nickname}</h2><p className={styles.muted}>{user.email}</p>{profile?.bio ? <p className={styles.bio}>{profile.bio}</p>:null}</div></div>
        <dl className={styles.details}><div><dt>가입일</dt><dd>{formatDate(user.created_at)}</dd></div><div><dt>이메일 인증</dt><dd>{user.email_confirmed_at ? '인증 완료':'인증 필요'}</dd></div><div><dt>회원 구분</dt><dd>{isAdminUser(user)?'관리자':'일반 회원'}</dd></div></dl>
      </section>
      <section className={styles.panel}><h2>프로필 편집</h2>{!profile ? <p role="status" className={styles.muted}>프로필을 불러오지 못했습니다. 잠시 후 다시 확인해 주세요.</p> : <><ProfileEditor name={nickname} photoUrl={profile.photoUrl} hasPhoto={profile.hasPhoto} bio={profile.bio}/><form action={changeNickname} className={styles.form}><label>닉네임<input name="nickname" defaultValue={profile.nickname} minLength={2} maxLength={16} required className={field}/></label><p className={styles.muted}>한글·영문·숫자·_·- / 2~16자. 기존 글의 작성자 이름에도 반영됩니다.</p><button className={styles.button}>닉네임 저장</button></form></>}</section>
    </div><div className={styles.column}>
      <section className={styles.panel} aria-label="내 기록 요약"><h2>내가 남긴 기록</h2><p className={styles.total}>{partial?'—':total}<span className={styles.muted}> 개</span></p><dl className={styles.counts}>{activity.map(item=><div key={item.label}><dt>{item.label}</dt><dd>{item.count ?? '—'}</dd></div>)}</dl>{partial?<p className={styles.muted}>일부 기록을 조회하지 못했습니다. 잠시 후 다시 확인해 주세요.</p>:null}<div className={styles.records}><h3>최근 작성한 기록</h3>{recent.length?<ul>{recent.map(record=><li key={record.id}><Link prefetch={false} href={record.href}><strong>{record.title}</strong><small>{record.label} · {formatDate(record.date)}</small></Link></li>)}</ul>:<p className={styles.muted}>{partial?'기록을 불러오지 못했습니다.':'아직 남긴 기록이 없습니다. 좋아하는 것부터 기록해 보세요.'}</p>}<Link href="/new" className={styles.securityLink}>새 기록 남기기 <span aria-hidden="true">→</span></Link></div></section>
      <section className={styles.panel}><h2>계정 관리</h2><Link href="/change-password" className={styles.securityLink}>비밀번호 변경 <span aria-hidden="true">→</span></Link>
      {!isAdminUser(user) ? <details className={styles.danger}><summary>회원 탈퇴</summary><p className={styles.muted}>계정과 프로필 사진은 삭제됩니다. 작성한 공개 글과 첨부 사진은 ‘탈퇴한 회원’으로 남고 이후 직접 수정·삭제할 수 없습니다. 삭제할 글이나 사진은 탈퇴 전에 정리해 주세요. 미사용 술 사진은 삭제됩니다.</p><form action={withdrawAccount} className={styles.form}><label>현재 비밀번호<input name="current_password" type="password" autoComplete="current-password" required className={field}/></label><label>확인 문구<input name="withdraw_confirm" placeholder="탈퇴" autoComplete="off" required pattern="탈퇴" className={field}/></label><Captcha siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}/><button className={styles.secondary}>안내를 확인했고 탈퇴합니다</button></form></details>:null}
      </section>
    </div></div><div className={styles.legal}><Link href="/terms">이용약관</Link><Link href="/privacy">개인정보 안내</Link></div>
  </section></div></main>;
}
