'use client';
import { useState } from 'react';
import { checkTossDiagnostic } from '@/app/admin/api-status/tossDiagnostic';
export function TossDiagnostic() {
  const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');
  return <div className="mt-3 border-t border-[var(--line)] pt-3"><button type="button" disabled={busy} aria-busy={busy} className="inline-flex min-h-11 items-center rounded-md border border-[var(--line)] bg-[var(--surface-muted)] px-3 text-xs font-bold disabled:opacity-60" onClick={async()=>{setBusy(true);setMessage('');try{const result=await checkTossDiagnostic();setMessage(result.message);}catch{setMessage('점검에 실패했습니다. 로그인 상태를 확인해 주세요.');}finally{setBusy(false);}}}>{busy?'토스 조회 중…':'토스 점검'}</button><p className="mt-2 text-xs leading-6 text-[var(--muted)]">베스트·상품 상세 1개·카테고리를 조회합니다. 키·원문 응답은 표시하지 않으며 링크는 발급하지 않습니다.</p>{message?<p role="status" className="mt-2 whitespace-pre-line break-words text-xs leading-6">{message}</p>:null}</div>;
}
