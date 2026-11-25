'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { removeProfilePhoto, saveProfileBio, saveProfilePhoto } from '@/app/account/profileActions';
import { maxProfilePhotoBytes } from '@/lib/memberProfile';
import { ProfileAvatar } from './ProfileAvatar';
import styles from './Account.module.css';
async function prepareAvatar(file: File) {
  if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size>10*1024*1024) throw Error('10MB 이하 JPG·PNG·WebP 사진을 선택해 주세요.');
  const image = await createImageBitmap(file);
  try {
    const canvas = document.createElement('canvas'); canvas.width=384; canvas.height=384;
    const context = canvas.getContext('2d'); if (!context) throw Error('이 브라우저에서 사진을 처리할 수 없습니다.');
    const side = Math.min(image.width,image.height);
    context.drawImage(image,(image.width-side)/2,(image.height-side)/2,side,side,0,0,384,384);
    const blob = await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/webp',.82));
    if (!blob || blob.type!=='image/webp' || blob.size>maxProfilePhotoBytes) throw Error('다른 사진을 선택해 주세요. 사진 용량을 줄이지 못했습니다.');
    return new File([blob],'avatar.webp',{type:'image/webp'});
  } finally { image.close(); }
}
export function ProfileEditor({name,photoUrl,hasPhoto,bio}:{name:string;photoUrl:string|null;hasPhoto:boolean;bio:string}) {
  const router=useRouter(); const input=useRef<HTMLInputElement>(null);
  const [photo,setPhoto]=useState<File|null>(null); const [preview,setPreview]=useState<string|null>(null);
  const [busy,setBusy]=useState(false); const [message,setMessage]=useState(''); const [error,setError]=useState(false);
  async function run(work:()=>Promise<{message?:string;error?:string}>) {
    setBusy(true);setMessage('');
    try { const result=await work();setError(!!result.error);setMessage(result.error || result.message || '');if(!result.error)router.refresh();return !result.error; }
    catch {setError(true);setMessage('처리하지 못했습니다. 로그인 상태를 확인하고 다시 시도해 주세요.');return false;}
    finally {setBusy(false);}
  }
  return <><form className={styles.photoForm} onSubmit={async event=>{event.preventDefault();if(!photo)return;const form=new FormData();form.set('photo',photo);if(await run(()=>saveProfilePhoto(form))){setPhoto(null);setPreview(null);if(input.current)input.current.value='';}}}>
    <div className={styles.identity}><ProfileAvatar src={preview || photoUrl} name={name} size={64}/><div><strong>프로필 사진</strong><p className={styles.muted}>사진은 정사각형으로 잘라 작게 저장합니다.<br/>본인 계정 영역에만 표시됩니다.</p></div></div>
    <label className={styles.muted}>사진 선택<input ref={input} type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={async event=>{const file=event.currentTarget.files?.[0];if(!file)return;setBusy(true);setMessage('');try{const prepared=await prepareAvatar(file);setPhoto(prepared);const reader=new FileReader();reader.onload=()=>setPreview(String(reader.result));reader.readAsDataURL(prepared);}catch(e){setPhoto(null);setPreview(null);setError(true);setMessage(e instanceof Error?e.message:'사진을 읽지 못했습니다.');}finally{setBusy(false);}}}/></label>
    <p className={styles.muted}>JPG·PNG·WebP · 원본 최대 10MB · 선택 후 저장해 주세요.</p><div className={styles.actions}><button className={styles.button} disabled={busy || !photo}>{busy?'처리 중…':'사진 저장'}</button>{hasPhoto ? <button className={styles.secondary} type="button" disabled={busy} onClick={()=>run(async()=>{const result=await removeProfilePhoto();if(!result.error){setPhoto(null);setPreview(null);if(input.current)input.current.value='';}return result;})}>기본 사진으로</button> : null}</div>
  </form><form className={styles.form} onSubmit={async event=>{event.preventDefault();const data=new FormData(event.currentTarget);await run(()=>saveProfileBio(data));}}><label>짧은 소개<textarea name="bio" defaultValue={bio} maxLength={120} rows={3} className={styles.input} placeholder="좋아하는 콘텐츠나 취향을 소개해 주세요." disabled={busy}/></label><p className={styles.muted}>선택 입력 · 최대 120자 · 현재는 본인에게만 표시됩니다.</p><button className={styles.button} disabled={busy}>소개 저장</button></form>{message ? <p role={error?'alert':'status'} className={styles.muted} style={{marginTop:12}}>{message}</p>:null}</>;
}
