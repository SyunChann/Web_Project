"use client";

import { useEffect, useState } from "react";

type StatusToastProps = {
  message: string;
};

export function StatusToast({ message }: StatusToastProps) {
  const [isVisible, setIsVisible] = useState(Boolean(message));
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    if (!message) {
      setIsVisible(false);
      setIsFading(false);
      return;
    }

    setIsVisible(true);
    setIsFading(false);

    const url = new URL(window.location.href);
    url.searchParams.delete("status");
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);

    const fadeTimer = window.setTimeout(() => {
      setIsFading(true);
    }, 2400);
    const hideTimer = window.setTimeout(() => {
      setIsVisible(false);
    }, 2750);

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(hideTimer);
    };
  }, [message]);

  if (!message || !isVisible) {
    return null;
  }

  return (
    <div
      className={`fixed left-1/2 top-5 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-md border border-[#d8cfc2] bg-white px-4 py-3 text-sm font-bold text-[#17202a] shadow-lg transition-opacity duration-300 ${
        isFading ? "opacity-0" : "opacity-100"
      }`}
    >
      {message}
    </div>
  );
}
