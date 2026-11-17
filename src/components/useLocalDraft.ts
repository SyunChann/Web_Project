"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { draftStorage, type LocalDraft } from "@/lib/localDraft";

export function useLocalDraft<T>(key: string, value: T, dirty: boolean, revision?: string) {
  const [draft, setDraft] = useState<LocalDraft<T>>();
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState("임시 저장 확인 중…");
  const latest = useRef({ value, dirty, revision });
  const blocked = useRef(true);
  const finished = useRef(false);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  useEffect(() => { latest.current = { value, dirty, revision }; }, [value, dirty, revision]);

  useEffect(() => {
    let alive = true;
    draftStorage<T>(key, "read").then((saved) => {
      if (!alive) return;
      const usable = saved && saved.revision === revision && Date.now() - saved.savedAt < 30 * 86400_000;
      if (usable) setDraft(saved);
      blocked.current = Boolean(usable);
      setStatus(usable ? "이 브라우저에 작성 중인 기록이 있습니다." : "글과 사진을 이 브라우저에 자동 저장합니다.");
      setReady(true);
    }).catch(() => { if (alive) { blocked.current = false; setReady(true); setStatus("임시 저장을 사용할 수 없습니다. 창을 닫기 전에 글을 등록해 주세요."); } });
    return () => { alive = false; };
  }, [key, revision]);

  const save = useCallback(() => {
    if (blocked.current || finished.current || !latest.current.dirty) return;
    const snapshot = { value: latest.current.value, revision: latest.current.revision, savedAt: Date.now() };
    queue.current = queue.current.catch(() => {}).then(() => draftStorage(key, "write", snapshot)).then(() => {
      if (!finished.current) setStatus(`임시 저장됨 · ${new Intl.DateTimeFormat("ko-KR", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Seoul" }).format(snapshot.savedAt)}`);
    }).catch(() => setStatus("임시 저장 공간이 부족하거나 사용할 수 없습니다. 창을 닫기 전에 글을 등록해 주세요."));
  }, [key]);

  useEffect(() => {
    if (!ready || draft || !dirty) return;
    const timer = setTimeout(save, 700);
    return () => clearTimeout(timer);
  }, [value, ready, draft, dirty, save]);
  useEffect(() => {
    const hidden = () => { if (document.hidden) save(); };
    window.addEventListener("pagehide", save);
    document.addEventListener("visibilitychange", hidden);
    return () => { save(); window.removeEventListener("pagehide", save); document.removeEventListener("visibilitychange", hidden); };
  }, [save]);

  const clear = useCallback(async () => {
    finished.current = true;
    await queue.current.catch(() => {});
    try { await draftStorage(key, "delete"); } catch { /* A saved post must still navigate after a storage failure. */ }
  }, [key]);
  const discard = async () => {
    await queue.current.catch(() => {});
    try { await draftStorage(key, "delete"); } catch { /* Allow writing even when storage is unavailable. */ }
    blocked.current = false; setDraft(undefined); setStatus("새 기록을 작성할 수 있습니다.");
  };
  const restore = () => { blocked.current = false; setDraft(undefined); setStatus("임시 저장한 글과 사진을 복구했습니다."); return draft?.value; };
  return { draft, ready, status, clear, discard, restore };
}
