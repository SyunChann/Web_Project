import { loginHref } from "@/lib/returnTo";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppNav } from "@/components/AppNav";
import { DrinkForm } from "@/components/drinks/DrinkForm";
import styles from "@/components/drinks/Drinks.module.css";
import { getDrinkPost, drinkPhotoUrl } from "@/data/drinks";
import { getSupabaseServerSession } from "@/lib/supabase/session";
export const metadata = { title: "술 기록 수정 | 취향보관소", robots: { index: false, follow: false } };
export default async function EditDrinkPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user } = await getSupabaseServerSession();
  if (!user) redirect(loginHref(`/drinks/${encodeURIComponent(id)}/edit`));
  const { post, error } = await getDrinkPost(id);
  if (!error && !post) notFound();
  if (post && user.id !== post.author_id) redirect(`/drinks/${id}`);
  return <main className={styles.page}><section className={styles.shell}><AppNav active="drinks" /><div className={styles.formWrap}>
    <Link href={`/drinks/${id}`} className={styles.back}>← 술 기록 상세</Link><header className={styles.hero}><div><p className={styles.eyebrow}>EDIT NOTE</p><h1>술 기록 수정</h1><p className={styles.description}>궁금했던 술을 마셨다면 리뷰로 바꿔보세요.</p></div></header>
    {error || !post ? <p role="status" className={styles.notice}>{error}</p> : <DrinkForm key={`${user.id}:${post.id}`} userId={user.id} post={post} photoUrls={post.images.map(drinkPhotoUrl)} />}
  </div></section></main>;
}
