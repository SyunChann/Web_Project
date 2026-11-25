import Link from "next/link";

export function AdminSectionNav({ active }: { active: "content" | "api-status" | "services" | "api-docs" }) {
  const sections = [
    { key: "content", href: "/admin", label: "콘텐츠 관리" },
    { key: "api-status", href: "/admin/api-status", label: "외부 API 현황" },
    { key: "services", href: "/admin/services", label: "서비스·연동" },
    { key: "api-docs", href: "/admin/api-docs", label: "API 문서" },
  ] as const;
  return <nav aria-label="관리자 메뉴" className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
    {sections.map(section => <Link key={section.key} href={section.href} prefetch={false} aria-current={section.key === active ? "page" : undefined}
      className={`inline-flex min-h-11 items-center justify-center rounded-md border px-2 py-2 text-center text-xs font-bold transition sm:px-4 sm:text-sm ${section.key === active ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--on-accent)]" : "border-[var(--line)] bg-[var(--surface)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]"}`}>
      {section.label}
    </Link>)}
  </nav>;
}
