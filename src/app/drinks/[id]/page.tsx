import { AuthorBadge } from "@/components/AuthorBadge";
import { ImageGallery } from "@/components/ImageGallery";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppNav } from "@/components/AppNav";
import { ListBackLink } from "@/components/ListBackLink";
import { StarRating } from "@/components/drinks/StarRating";
import { DeleteDrinkButton } from "@/components/drinks/DeleteDrinkButton";
import styles from "@/components/drinks/Drinks.module.css";
import { getDrinkPost, drinkPhotoUrl } from "@/data/drinks";
import { drinkCategories, drinkKinds } from "@/lib/drinks";
import { getSupabaseServerSession } from "@/lib/supabase/session";
import { postMetadata } from "@/lib/postMetadata";
export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { post } = await getDrinkPost(id);
  return postMetadata({ title: post?.name ?? "술 기록", description: post?.body, path: `/drinks/${id}`, image: post?.images[0] ? drinkPhotoUrl(post.images[0]) : undefined });
}
export default async function DrinkDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { post, error } = await getDrinkPost(id);
  if (!error && !post) notFound();
  const { user } = await getSupabaseServerSession();
  return <main className={styles.page}><section className={styles.shell}><AppNav active="drinks" /><article className={styles.article}>
    <ListBackLink href="/drinks" className={styles.back}>← 술 취향 목록</ListBackLink>
    {error || !post ? <p className={styles.notice} role="status">{error}</p> : <>
      <header className={styles.hero}><div><div className={styles.badges}><span>{drinkCategories[post.category]}</span><span>{drinkKinds[post.kind]}</span></div><h1>{post.name}</h1>
        <div className={styles.meta}><AuthorBadge name={post.author_name} authorId={post.author_id}/><time dateTime={post.created_at}>{new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "long" }).format(new Date(post.created_at))}</time></div>
      </div>{user?.id === post.author_id ? <div className={styles.actions}><Link className={styles.secondary} href={`/drinks/${id}/edit`}>수정</Link><DeleteDrinkButton id={id} /></div> : null}</header>
      {post.rating !== null ? <div className="mt-5"><StarRating rating={Number(post.rating)} large /></div> : null}
      {post.methods.length ? <p className="mt-5"><strong>마신 방법</strong> · {post.methods.join(" · ")}</p> : null}
      {post.tags.length ? <div className={`${styles.badges} mt-4`} aria-label="맛 태그">{post.tags.map((tag) => <span key={tag}>{tag}</span>)}</div> : null}
      <div className={styles.body}>{post.body}</div>
      <div className={styles.gallery}><ImageGallery images={post.images.map((path, index) => ({ src: drinkPhotoUrl(path), alt: `${post.name} 사진 ${index + 1}` }))} /></div>
    </>}
  </article></section></main>;
}
