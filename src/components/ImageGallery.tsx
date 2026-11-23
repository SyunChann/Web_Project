"use client";
import Image from "next/image";
import { useId, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Modal } from "@/components/Modal";

export function ImageGallery({ images }: { images: { src: string; alt: string }[] }) {
  const [selected, setSelected] = useState<number | null>(null);
  const id = useId();
  const move = (offset: number) => setSelected((index) => index === null ? null : (index + offset + images.length) % images.length);
  const current = selected === null ? null : images[selected];
  return <>
    {images.map((image, index) => <button type="button" key={image.src} onClick={() => setSelected(index)}
      className="block w-full rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--foreground)]" aria-label={`${image.alt} 크게 보기`}>
      <Image src={image.src} alt={image.alt} width={1920} height={1920} sizes="(max-width:768px) calc(100vw - 3rem), 768px" unoptimized={image.src.toLowerCase().endsWith(".gif")} />
    </button>)}
    {current && selected !== null ? <Modal onClose={() => setSelected(null)} labelledBy={`${id}-title`} className="w-[calc(100%-1rem)] max-w-6xl"
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") { event.preventDefault(); move(-1); }
        if (event.key === "ArrowRight") { event.preventDefault(); move(1); }
      }}>
      <div className="flex items-center justify-between gap-2 border-b border-[var(--line)] px-3 py-2">
        <p id={`${id}-title`} className="min-w-0 text-sm font-bold" aria-live="polite">사진 {selected + 1} / {images.length}</p>
        <button type="button" data-autofocus onClick={() => setSelected(null)} aria-label="사진 닫기" className="grid min-h-[44px] min-w-[44px] place-items-center rounded-lg hover:bg-[var(--surface-muted)]"><X size={22} /></button>
      </div>
      <div className="relative h-[min(70dvh,48rem)] min-h-40 bg-[var(--background)]">
        <Image src={current.src} alt={current.alt} fill sizes="100vw" className="object-contain" unoptimized={current.src.toLowerCase().endsWith(".gif")} />
      </div>
      {images.length > 1 ? <div className="flex items-center justify-between gap-3 border-t border-[var(--line)] p-2">
        <button type="button" onClick={() => move(-1)} className="inline-flex min-h-[44px] items-center gap-1 rounded-md px-3 font-bold hover:bg-[var(--surface-muted)]"><ChevronLeft size={20} />이전 사진</button>
        <button type="button" onClick={() => move(1)} className="inline-flex min-h-[44px] items-center gap-1 rounded-md px-3 font-bold hover:bg-[var(--surface-muted)]">다음 사진<ChevronRight size={20} /></button>
      </div> : null}
    </Modal> : null}
  </>;
}
