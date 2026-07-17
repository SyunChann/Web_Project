"use client";

import { useState, type ReactNode } from "react";

type ConfirmSubmitButtonProps = {
  triggerLabel: string;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  icon?: ReactNode;
  ariaLabel?: string;
  triggerClassName: string;
  confirmClassName?: string;
};

export function ConfirmSubmitButton({
  triggerLabel,
  title,
  description,
  confirmLabel,
  cancelLabel = "취소",
  icon,
  ariaLabel,
  triggerClassName,
  confirmClassName = "bg-[#be4b49] text-white hover:bg-[#a83f3d]",
}: ConfirmSubmitButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={triggerClassName}
        aria-label={ariaLabel ?? (triggerLabel || title)}
        title={ariaLabel ?? (triggerLabel || title)}
      >
        {icon}
        {triggerLabel}
      </button>

      {isOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#17202a]/45 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-modal-title"
        >
          <div className="w-full max-w-sm rounded-lg border border-[#d8cfc2] bg-[#f7f3ed] p-5 shadow-xl">
            <h2
              id="confirm-modal-title"
              className="text-lg font-black text-[#17202a]"
            >
              {title}
            </h2>
            <p className="mt-3 leading-7 text-[#52616b]">{description}</p>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-md border border-[#d8cfc2] bg-white px-4 py-2 text-sm font-bold text-[#52616b] shadow-sm transition hover:border-[#be4b49] hover:text-[#be4b49]"
              >
                {cancelLabel}
              </button>
              <button
                type="submit"
                className={`rounded-md px-4 py-2 text-sm font-bold shadow-sm transition ${confirmClassName}`}
              >
                {confirmLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
