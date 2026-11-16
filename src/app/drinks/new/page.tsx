import { redirect } from "next/navigation";
import Link from "next/link";
import { AppNav } from "@/components/AppNav";
import { DrinkForm } from "@/components/drinks/DrinkForm";
import styles from "@/components/drinks/Drinks.module.css";
import { createSupabaseServerClient } from "@/lib/supabase/server";
export const metadata = { title: "술 기록 쓰기 | 취향보관소", robots: { index: false, follow: false } };
export default async function NewDrinkPage() {
  const client = await createSupabaseServerClient();
  const { data: { user } } = client ? await client.auth.getUser() : { data: { user: null } };
  if (!user) redirect("/login");
  return <main className={styles.page}><section className={styles.shell}><AppNav active="drinks" /><div className={styles.formWrap}>
    <Link href="/drinks" className={styles.back}>← 술 취향 목록</Link><header className={styles.hero}><div><p className={styles.eyebrow}>NEW NOTE</p><h1>술 기록 쓰기</h1><p className={styles.description}>작성자 이름은 로그인 정보로 자동 등록됩니다.</p></div></header>
    <DrinkForm />
  </div></section></main>;
}
