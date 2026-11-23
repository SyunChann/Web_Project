"use client";
import Image from "next/image";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { saveDrinkPost } from "@/app/actions/drinks";
import { supabaseUrl, supabaseKey } from "@/lib/supabase/config";
import { drinkBucket, drinkCategories, drinkKinds, drinkingMethods, tasteTags, maxDrinkPhotos, maxDrinkPhotoSize, drinkImageTypes, type DrinkPost, type DrinkSaveResult } from "@/lib/drinks";
import { StarRating } from "./StarRating";
import { useLocalDraft } from "@/components/useLocalDraft";
import { prepareUploadPhoto } from "@/lib/uploadPhoto";
import styles from "./Drinks.module.css";

type Photo = { id: string; file: File; preview: string; originalSize: number };
const fileSize = (size: number) => size < 1024 * 1024 ? `${Math.round(size / 1024)}KB` : `${(size / 1024 / 1024).toFixed(1)}MB`;

export function DrinkForm({ post, photoUrls = [], userId }: { post?: DrinkPost; photoUrls?: string[]; userId: string }) {
  const router = useRouter();
  const [kind, setKind] = useState(post?.kind ?? "review");
  const [rating, setRating] = useState(post?.rating ?? 0);
  const [name, setName] = useState(post?.name ?? "");
  const [body, setBody] = useState(post?.body ?? "");
  const [category, setCategory] = useState(post?.category ?? "whisky");
  const [methods, setMethods] = useState(post?.methods ?? []);
  const [tags, setTags] = useState(post?.tags ?? []);
  const [kept, setKept] = useState(post?.images ?? []);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [cover, setCover] = useState(post?.images[0] ?? "");
  const [optimizing, setOptimizing] = useState(false);
  const [fileError, setFileError] = useState("");
  const previewUrls = useRef<string[]>([]);
  const uploaded = useRef(new Map<File, string>());
  const fileInput = useRef<HTMLInputElement>(null);
  const draftValue = useMemo(() => ({ kind, rating, name, body, category, methods, tags, kept, cover,
    photos: photos.map(({ id, file, originalSize }) => ({ id, file, originalSize })),
  }), [kind, rating, name, body, category, methods, tags, kept, cover, photos]);
  const [initialDraft] = useState(draftValue);
  const draft = useLocalDraft(`drink:v1:${userId}:${post?.id ?? "new"}`, draftValue, draftValue !== initialDraft, post?.updated_at);
  const imageKeys = [...kept, ...photos.map((photo) => photo.id)];
  const representative = imageKeys.includes(cover) ? cover : imageKeys[0];
  useEffect(() => () => previewUrls.current.forEach((url) => URL.revokeObjectURL(url)), []);
  const [state, action, pending] = useActionState<DrinkSaveResult, FormData>(async (_, data) => {
    if (fileError) return { error: fileError };
    if (kind === "review" && (!Number.isFinite(rating) || rating < .5 || rating > 5 || rating * 2 % 1 !== 0)) return { error: "평점을 0.5~5점 중에서 선택해 주세요." };
    if (!supabaseUrl || !supabaseKey) return { error: "로그인 설정을 확인해 주세요." };
    const client = createBrowserClient(supabaseUrl, supabaseKey);
    const { data: { user } } = await client.auth.getUser();
    if (!user) return { error: "로그인 후 다시 시도해 주세요." };
    const added: string[] = [];
    let saving = false;
    try {
      for (const { file } of photos) {
        let path = uploaded.current.get(file);
        if (!path) {
          const extension = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" }[file.type];
          path = `${user.id}/${crypto.randomUUID()}.${extension}`;
          const { error } = await client.storage.from(drinkBucket).upload(path, file, { contentType: file.type, upsert: false });
          if (error) throw new Error("사진을 업로드하지 못했습니다. 파일과 연결 상태를 확인해 주세요.");
          uploaded.current.set(file, path);
        }
        added.push(path);
      }
      data.delete("images");
      const paths = [...kept, ...added];
      const coverIndex = imageKeys.indexOf(representative);
      if (coverIndex > 0) paths.unshift(...paths.splice(coverIndex, 1));
      paths.forEach((path) => data.append("images", path));
      saving = true;
      const result = await saveDrinkPost(post?.id ?? null, data);
      if (result.id) { await draft.clear(); router.push(`/drinks/${result.id}`); router.refresh(); }
      else if (result.error && added.length) {
        await client.storage.from(drinkBucket).remove(added);
        uploaded.current.clear();
      }
      return result;
    } catch (error) {
      // After a network failure during save the write may have succeeded; keep those photos for retry.
      if (!saving && added.length) { await client.storage.from(drinkBucket).remove(added); uploaded.current.clear(); }
      return { error: error instanceof Error && !saving ? error.message : "저장 결과를 확인하지 못했습니다. 목록을 확인하거나 다시 시도해 주세요." };
    }
  }, {});

  async function selectPhotos(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length) return;
    if (files.length + kept.length + photos.length > maxDrinkPhotos || files.some((file) => !drinkImageTypes.includes(file.type) || file.size > 20 * 1024 * 1024)) {
      setFileError("사진은 총 5장, 원본은 장당 20MB 이하의 JPG/PNG/WebP/GIF로 선택해 주세요."); return;
    }
    setOptimizing(true); setFileError("");
    const next: Photo[] = [];
    try {
      for (const original of files) {
        const file = await prepareUploadPhoto(original);
        if (file.size > maxDrinkPhotoSize) throw new Error("최적화 후에도 5MB를 넘는 사진이 있습니다. 더 작은 사진을 선택해 주세요.");
        const preview = URL.createObjectURL(file);
        next.push({ id: crypto.randomUUID(), file, preview, originalSize: original.size });
      }
      previewUrls.current.push(...next.map((photo) => photo.preview));
      setPhotos((previous) => [...previous, ...next]);
    } catch (error) {
      next.forEach((photo) => URL.revokeObjectURL(photo.preview));
      setFileError(error instanceof Error ? error.message : "사진을 준비하지 못했습니다. 다시 선택해 주세요.");
    } finally { setOptimizing(false); }
  }

  function restoreDraft() {
    const saved = draft.restore();
    if (!saved) return;
    setKind(saved.kind); setRating(saved.rating); setName(saved.name); setBody(saved.body); setCategory(saved.category);
    setMethods(saved.methods); setTags(saved.tags); setKept(saved.kept); setCover(saved.cover);
    const restored = saved.photos.map((photo) => ({ ...photo, preview: URL.createObjectURL(photo.file) }));
    previewUrls.current.push(...restored.map((photo) => photo.preview)); setPhotos(restored);
  }

  return <form action={action} className={styles.form}>
    <aside className={styles.draftNotice} aria-label="임시 저장">
      <p role="status">{draft.status}</p>
      <p className={styles.hint}>이 기기·브라우저에서만 복구할 수 있으며, 브라우저 데이터를 지우면 삭제됩니다.</p>
      {draft.draft ? <div className={styles.actions}><button type="button" className={styles.secondary} onClick={restoreDraft}>이어서 작성</button><button type="button" className={styles.textButton} onClick={() => void draft.discard()}>임시 기록 버리기</button></div> : null}
    </aside>
    <fieldset disabled={pending || optimizing || !draft.ready || Boolean(draft.draft)} className={styles.fields}>
      <div className={styles.twoColumns}>
        <label>글 구분<select name="kind" aria-label="글 구분" value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>{Object.entries(drinkKinds).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label>술 종류<select name="category" aria-label="술 종류" value={category} onChange={(e) => setCategory(e.target.value as typeof category)}>{Object.entries(drinkCategories).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      </div>
      <label>술 이름 <span className={styles.required}>필수</span><input name="name" required maxLength={100} value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 발베니 더블우드 12년" /></label>
      {kind === "review" ? <>
        <fieldset className={styles.ratingField}><legend>평점 <span className={styles.required}>필수</span></legend>
          <p className={styles.ratingHelp}>별의 왼쪽은 반 점, 오른쪽은 한 점입니다. 키보드 방향키로도 선택할 수 있어요.</p>
          <div className={styles.mobileRatingPicker} role="group" aria-label="평점 선택">
            {Array.from({ length: 10 }, (_, i) => (i + 1) / 2).map((value) => <button type="button" key={value} aria-label={`${value}점 선택`} aria-pressed={rating === value} onClick={() => setRating(value)}>{value.toFixed(1)}<span aria-hidden="true">★</span></button>)}
          </div>
          <div className={styles.ratingPicker}>{[1, 2, 3, 4, 5].map((star) => <div key={star} className={styles.ratingSlot}>
            <span aria-hidden="true" className={styles.star}>★<i style={{ width: `${Math.max(0, Math.min(1, rating - star + 1)) * 100}%` }}>★</i></span>
            {[star - .5, star].map((value, index) => <label key={value} className={`${styles.ratingHit} ${index ? styles.rightHalf : ""}`}>
              <input type="radio" name="rating" value={value} checked={rating === value} onChange={() => setRating(value)} aria-label={`${value}점`} />
            </label>)}
          </div>)}</div>
          {rating > 0 ? <StarRating rating={rating} /> : <p className={styles.hint}>0.5~5점 중 선택해 주세요.</p>}
        </fieldset>
        <fieldset><legend>마신 방법 <span className={styles.hint}>선택 · 여러 개 가능</span></legend><div className={styles.chips}>{drinkingMethods.map((method) => <label key={method}><input type="checkbox" name="methods" value={method} checked={methods.includes(method)} onChange={(e) => setMethods(e.target.checked ? [...methods, method] : methods.filter((v) => v !== method))} /><span>{method}</span></label>)}</div></fieldset>
        <fieldset><legend>맛 태그 <span className={styles.hint}>선택 · 여러 개 가능</span></legend><div className={styles.chips}>{tasteTags.map((tag) => <label key={tag}><input type="checkbox" name="tags" value={tag} checked={tags.includes(tag)} onChange={(e) => setTags(e.target.checked ? [...tags, tag] : tags.filter((v) => v !== tag))} /><span>{tag}</span></label>)}</div></fieldset>
      </> : <p className={styles.notice}>궁금한 술은 평점 없이 등록됩니다. 마셔본 뒤 리뷰로 바꿔 별점과 맛을 남겨보세요.</p>}
      <label>{kind === "review" ? "시음 후기" : "궁금한 이유·질문"} <span className={styles.required}>필수</span><textarea name="body" required rows={9} maxLength={10000} value={body} onChange={(e) => setBody(e.target.value)} placeholder={kind === "review" ? "향, 맛, 여운과 기억에 남는 점을 자유롭게 적어주세요." : "어떤 점이 궁금한가요? 마셔보고 싶은 이유를 적어주세요."} /></label>
      <div><label htmlFor="drink-photos">사진 <span className={styles.hint}>선택</span></label>
        <p className={styles.hint}>최대 5장 · 원본 장당 20MB 이하 · JPG/PNG/WebP/GIF. 큰 사진은 자동 최적화하며, 저장할 사진은 장당 5MB 이하입니다. GIF는 원본을 유지합니다.</p>
        <input id="drink-photos" ref={fileInput} type="file" accept={drinkImageTypes.join(",")} multiple onChange={selectPhotos} />
        <p role="status" className={styles.hint}>{optimizing ? "사진 용량을 최적화하고 있습니다…" : `${imageKeys.length}/5장 · 대표 사진을 선택해 주세요.`}</p>
        <div className={styles.previews}>{kept.map((path) => <div key={path}><Image src={photoUrls[post!.images.indexOf(path)]} alt="기존 사진" width={120} height={120} unoptimized /><button type="button" aria-pressed={representative === path} onClick={() => setCover(path)}>{representative === path ? "✓ 대표 사진" : "대표로 선택"}</button><button type="button" onClick={() => setKept(kept.filter((value) => value !== path))}>사진 제외</button></div>)}
          {photos.map(({ id, file, preview, originalSize }) => <div key={id}><Image src={preview} alt={file.name} width={120} height={120} unoptimized /><p className={styles.hint}>{originalSize > file.size ? `${fileSize(originalSize)} → ` : ""}{fileSize(file.size)}</p><button type="button" aria-pressed={representative === id} onClick={() => setCover(id)}>{representative === id ? "✓ 대표 사진" : "대표로 선택"}</button><button type="button" onClick={() => { URL.revokeObjectURL(preview); previewUrls.current = previewUrls.current.filter((url) => url !== preview); setPhotos(photos.filter((photo) => photo.id !== id)); setFileError(""); }}>사진 제외</button></div>)}
        </div>
        {photos.length ? <button type="button" className={styles.textButton} onClick={() => { previewUrls.current.forEach((url) => URL.revokeObjectURL(url)); previewUrls.current = []; setPhotos([]); setFileError(""); if (fileInput.current) fileInput.current.value = ""; }}>새 사진 선택 취소</button> : null}
      </div>
    </fieldset>
    {fileError || state.error ? <p role="alert" className={styles.error}>{fileError || state.error}</p> : null}
    <button disabled={pending || optimizing || !draft.ready || Boolean(draft.draft)} className={styles.primary} type="submit">{pending ? "사진·글 저장 중…" : optimizing ? "사진 준비 중…" : post ? "수정 저장" : "술 기록 남기기"}</button>
  </form>;
}
