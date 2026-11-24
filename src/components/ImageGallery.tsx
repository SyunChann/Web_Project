"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type MouseEvent, type PointerEvent } from "react";

const zoom = 2;
type Photo = { src: string; alt: string };
type Lens = { x: number; y: number; size: number; image: string; width: number; height: number; offsetX: number; offsetY: number };

function MagnifyingPhoto({ image }: { image: Photo }) {
  const [lens, setLens] = useState<Lens | null>(null);
  const frameId = useRef<number | null>(null);
  const point = useRef<{ button: HTMLButtonElement; x: number; y: number } | null>(null);
  useEffect(() => () => { if (frameId.current !== null) cancelAnimationFrame(frameId.current); }, []);
  function hide() {
    if (frameId.current !== null) cancelAnimationFrame(frameId.current);
    frameId.current = null;
    point.current = null;
    setLens(null);
  }

  function showAt(button: HTMLButtonElement, clientX: number, clientY: number) {
    const photo = button.querySelector("img");
    if (!photo?.naturalWidth || !photo.naturalHeight) return;
    const frame = button.getBoundingClientRect();
    const bounds = photo.getBoundingClientRect();
    // object-fit: contain can leave space beside a portrait or landscape photo.
    const ratio = Math.min(bounds.width / photo.naturalWidth, bounds.height / photo.naturalHeight);
    const width = photo.naturalWidth * ratio;
    const height = photo.naturalHeight * ratio;
    const left = bounds.left + (bounds.width - width) / 2;
    const top = bounds.top + (bounds.height - height) / 2;
    const x = clientX - left;
    const y = clientY - top;
    if (x < 0 || y < 0 || x > width || y > height) { setLens(null); return; }
    const size = Math.min(280, frame.width * 0.7);
    setLens({ x: clientX - frame.left, y: clientY - frame.top, size, image: photo.currentSrc || photo.src,
      width: width * zoom, height: height * zoom, offsetX: size / 2 - x * zoom, offsetY: size / 2 - y * zoom });
  }

  function move(event: PointerEvent<HTMLButtonElement>) {
    if (event.pointerType === "mouse" || (event.pointerType === "pen" && event.buttons === 0)) {
      point.current = { button: event.currentTarget, x: event.clientX, y: event.clientY };
      if (frameId.current !== null) return;
      frameId.current = requestAnimationFrame(() => {
        frameId.current = null;
        const next = point.current;
        if (next) showAt(next.button, next.x, next.y);
      });
    }
  }

  function toggle(event: MouseEvent<HTMLButtonElement>) {
    // Pointer input is handled separately; keyboard activation magnifies the centre.
    if (event.detail !== 0) return;
    if (lens) hide();
    else {
      const bounds = event.currentTarget.getBoundingClientRect();
      showAt(event.currentTarget, bounds.left + bounds.width / 2, bounds.top + bounds.height / 2);
    }
  }

  return <button type="button" aria-label={`${image.alt} 부분 확대`} aria-pressed={Boolean(lens)}
    title="마우스를 올리면 부분 확대 · 터치하면 확대/해제"
    onPointerEnter={move} onPointerMove={move}
    onPointerLeave={(event) => { if (event.pointerType !== "touch") hide(); }}
    onPointerUp={(event) => { if (event.pointerType === "touch") { if (lens) hide(); else showAt(event.currentTarget, event.clientX, event.clientY); } }}
    onPointerCancel={hide} onClick={toggle} onBlur={hide}
    onKeyDown={(event) => { if (event.key === "Escape") hide(); }}
    className="relative block w-full cursor-zoom-in overflow-hidden rounded-lg p-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--foreground)]">
    <Image src={image.src} alt={image.alt} width={1920} height={1920} sizes="(max-width:768px) calc(100vw - 3rem), 768px" unoptimized={image.src.toLowerCase().endsWith(".gif")} />
    {lens ? <span aria-hidden="true" data-magnifier className="pointer-events-none absolute rounded-full border-2 border-white shadow-xl ring-1 ring-black/20"
      style={{ left: lens.x - lens.size / 2, top: lens.y - lens.size / 2, width: lens.size, height: lens.size,
        backgroundColor: "var(--surface)", backgroundImage: `url(${JSON.stringify(lens.image)})`, backgroundRepeat: "no-repeat",
        backgroundSize: `${lens.width}px ${lens.height}px`, backgroundPosition: `${lens.offsetX}px ${lens.offsetY}px` }} /> : null}
  </button>;
}

export function ImageGallery({ images }: { images: Photo[] }) {
  return <>{images.map((image) => <MagnifyingPhoto key={image.src} image={image} />)}</>;
}
