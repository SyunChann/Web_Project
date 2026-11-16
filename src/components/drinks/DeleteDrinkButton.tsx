"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteDrinkPost } from "@/app/actions/drinks";
import styles from "./Drinks.module.css";
export function DeleteDrinkButton({ id }: { id: string }) {
  const [pending, start] = useTransition(); const [error, setError] = useState(""); const router = useRouter();
  return <div><button className={styles.secondary} disabled={pending} onClick={() => {
    if (!confirm("이 술 기록을 삭제할까요?")) return;
    start(async () => {
      try { const result = await deleteDrinkPost(id); if (result.error) setError(result.error); else { router.push("/drinks"); router.refresh(); } }
      catch { setError("삭제하지 못했습니다. 잠시 후 다시 시도해 주세요."); }
    });
  }}>{pending ? "삭제 중…" : "삭제"}</button>{error ? <p role="alert" className={styles.error}>{error}</p> : null}</div>;
}
