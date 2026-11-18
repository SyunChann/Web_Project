import Link from "next/link";

export function AdminSectionNav({ active }: { active: "content" | "api-status" | "services" }) {
  const sections = [
    { key: "content", href: "/admin", label: "콘텐츠 관리" },
    { key: "api-status", href: "/admin/api-status", label: "외부 API 현황" },
    { key: "services", href: "/admin/services", label: "서비스·연동" },
  ] as const;
  return <nav aria-label="관리자 메뉴" className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
    {sections.map(section => <Link key={section.key} href={section.href} prefetch={false} aria-current={section.key === active ? "page" : undefined}
      className={`inline-flex min-h-11 items-center justify-center rounded-md border px-2 py-2 text-center text-xs font-bold transition sm:px-4 sm:text-sm ${section.key === active ? "border-[#be4b49] bg-[#be4b49] !text-white" : "border-[#d8cfc2] bg-white text-[#52616b] hover:border-[#be4b49] hover:text-[#be4b49]"}`}>
      {section.label}
    </Link>)}
  </nav>;
}
