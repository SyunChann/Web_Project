"use client";

import { useFormStatus } from "react-dom";

export function SignupSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-2 rounded-md bg-[#be4b49] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#a83f3d] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "가입 요청 중..." : "가입하기"}
    </button>
  );
}
