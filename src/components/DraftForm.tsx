"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { unstable_rethrow, usePathname, useRouter, useSearchParams } from "next/navigation";
import { useLocalDraft } from "@/components/useLocalDraft";
import { captureForm, restoreForm, type FormSnapshot } from "@/lib/formDraft";
import { safeReturnTo } from "@/lib/returnTo";

type DraftFormProps<T> = {
  draftKey: string; revision?: string; extra?: T; onRestoreExtra?: (value: T) => void;
  action: (data: FormData) => unknown | Promise<unknown>; children: ReactNode; className?: string;
};

export function DraftForm<T>(props: DraftFormProps<T>) {
  return <DraftFormContent key={`${props.draftKey}:${props.revision ?? "new"}`} {...props} />;
}

function DraftFormContent<T>({ draftKey, revision, extra, onRestoreExtra, action, children, className }: DraftFormProps<T>) {
  const ref = useRef<HTMLFormElement>(null);
  const busy = useRef(false);
  const restoring = useRef(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");
  const [snapshot, setSnapshot] = useState<FormSnapshot<T>>({ fields: [], photos: [], extra });
  const draft = useLocalDraft(draftKey, snapshot, dirty, revision);
  const latestExtra = useRef(extra);
  const extraVersion = JSON.stringify(extra ?? null);
  const previousExtra = useRef(extraVersion);
  const router = useRouter();
  const pathname = usePathname();
  const query = useSearchParams().toString();
  const returnTo = safeReturnTo(pathname + (query ? `?${query}` : ""));
  useEffect(() => { latestExtra.current = extra; }, [extra]);
  function capture() {
    if (!ref.current || busy.current || restoring.current || !draft.ready || draft.draft) return;
    setDirty(true);
    setSnapshot(captureForm(ref.current, latestExtra.current));
  }
  useEffect(() => {
    if (previousExtra.current === extraVersion) return;
    previousExtra.current = extraVersion;
    if (!ref.current || busy.current || restoring.current || !draft.ready || draft.draft) return;
    const frame = requestAnimationFrame(() => {
      if (!ref.current || busy.current || restoring.current) return;
      setDirty(true);
      setSnapshot(captureForm(ref.current, latestExtra.current));
    });
    return () => cancelAnimationFrame(frame);
  }, [extraVersion, draft.ready, draft.draft]);

  function restore() {
    const saved = draft.restore();
    if (!saved) return;
    restoring.current = true;
    if (saved.extra !== undefined) onRestoreExtra?.(saved.extra);
    setSnapshot(saved);
    setDirty(true);
    requestAnimationFrame(() => {
      if (ref.current && !restoreForm(ref.current, saved)) setError("글은 복구했습니다. 이 브라우저에서는 사진을 다시 선택해 주세요.");
      restoring.current = false;
    });
  }
  async function submit(data: FormData) {
    if (busy.current || !ref.current || !draft.ready || draft.draft) return;
    const current = captureForm(ref.current, latestExtra.current);
    busy.current = true;
    setSaving(true);
    setError("");
    try {
      await draft.persist(current);
      const result = await action(data);
      if (result && typeof result === "object" && "redirectTo" in result && typeof result.redirectTo === "string"
        && /^\/(reviews|watchlist|merchandise|restaurants|travel)\//.test(result.redirectTo) && safeReturnTo(result.redirectTo) === result.redirectTo) {
        await draft.clear();
        router.push(result.redirectTo);
        router.refresh();
      } else setError("저장 결과를 확인하지 못했습니다. 목록을 확인한 뒤 다시 시도해 주세요. 임시 기록은 유지됩니다.");
    } catch (caught) {
      unstable_rethrow(caught);
      setError("저장하지 못했습니다. 입력 내용과 임시 기록은 유지됩니다. 내용을 확인하거나 잠시 후 다시 시도해 주세요.");
    } finally { busy.current = false; setSaving(false); }
  }
  return <form ref={ref} action={submit} className={`min-w-0 [&_label]:min-w-0 [&_input]:min-w-0 [&_input]:max-w-full [&_textarea]:min-w-0 [&_select]:min-w-0 ${className ?? ""}`} onChangeCapture={capture} onInputCapture={capture} onReset={(event) => event.preventDefault()} aria-busy={saving}>
    <input type="hidden" name="return_to" value={returnTo} />
    <aside className="rounded-lg border border-[var(--line)] bg-[var(--surface-muted)] p-3 text-sm leading-6 text-[var(--muted)]" aria-label="임시 저장">
      <p role="status">{draft.status}</p>
      <p className="text-xs">이 계정의 작성 내용을 이 기기·브라우저에만 저장합니다.</p>
      {draft.draft ? <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" onClick={restore} className="min-h-[44px] rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 font-bold text-[var(--foreground)]">이어서 작성</button>
        <button type="button" onClick={() => void draft.discard()} className="min-h-[44px] px-3 underline">임시 기록 버리기</button>
      </div> : null}
    </aside>
    <fieldset disabled={saving || !draft.ready || Boolean(draft.draft)} className="contents">{children}</fieldset>
    {error ? <p role="alert" className="rounded-md bg-red-50 p-3 text-sm leading-6 text-red-800 dark:bg-red-950/40 dark:text-red-200">{error}</p> : null}
  </form>;
}
