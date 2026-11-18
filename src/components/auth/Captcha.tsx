"use client";
import { useEffect, useRef, useState } from "react";
import Script from "next/script";
type Turnstile = { render: (container: HTMLElement, options: Record<string, unknown>) => string; remove: (id: string) => void };
export function Captcha({ siteKey }: { siteKey?: string }) {
  const container = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false), [token, setToken] = useState(""), [failed, setFailed] = useState(false);
  useEffect(() => {
    const api = (window as Window & { turnstile?: Turnstile }).turnstile;
    if (!siteKey || !ready || !container.current || !api) return;
    const id = api.render(container.current, { sitekey: siteKey, size: "flexible", callback: (value: string) => { setToken(value); setFailed(false); }, "expired-callback": () => setToken(""), "error-callback": () => { setToken(""); setFailed(true); } });
    return () => api.remove(id);
  }, [siteKey, ready]);
  if (!siteKey) return null;
  return <div className="min-w-0"><Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" onReady={() => setReady(true)} onError={() => setFailed(true)} /><div ref={container} /><input type="hidden" name="captcha_token" value={token} />{failed ? <p role="alert" className="text-xs leading-6 text-[#a73735]">자동 가입 방지 인증을 불러오지 못했습니다. 페이지를 새로고침해 주세요.</p> : null}</div>;
}
