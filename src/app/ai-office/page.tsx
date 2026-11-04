import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppNav } from "@/components/AppNav";
import { AiOfficeWorld } from "@/components/ai-office/AiOfficeWorld";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "AI Office | 취향보관소",
  description: "집의 게임룸과 AI 회사를 오가는 인터랙티브 픽셀 오피스",
  robots: { index: false, follow: false },
};

export default async function AiOfficePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-[#eef1ed]">
      <section className="mx-auto w-full max-w-7xl">
        <AppNav active="ai-office" />
        <AiOfficeWorld />
      </section>
    </main>
  );
}
