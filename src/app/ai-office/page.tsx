import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppNav } from "@/components/AppNav";
import { AiOfficeWorld } from "@/components/ai-office/AiOfficeWorld";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "AI Office | 취향보관소",
  description: "장소를 클릭해 캐릭터를 이동시키는 로그인 전용 Pixel Agents 오피스",
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
