'use client';
import Image from 'next/image';
import { useState } from 'react';
export function ProfileAvatar({ src, name, size = 80 }: { src: string | null; name: string; size?: number }) {
  const [failed, setFailed] = useState<string | null>(null);
  return <span style={{width:size,height:size,flexShrink:0,borderRadius:'50%',overflow:'hidden',display:'inline-grid',placeItems:'center',background:'var(--surface-muted, #e7ede8)',color:'var(--foreground)',fontSize:size/2.5,fontWeight:700}}>
    {src && src !== failed ? <Image src={src} alt={`${name} 프로필 사진`} width={size} height={size} unoptimized loading="lazy" referrerPolicy="no-referrer" style={{width:'100%',height:'100%',objectFit:'cover'}} onError={()=>setFailed(src)}/> : <span aria-label={`${name} 기본 프로필`}>{Array.from(name)[0] || '나'}</span>}
  </span>;
}
