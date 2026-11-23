import { loginHref } from "@/lib/returnTo";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppNav } from "@/components/AppNav";
import { AiOfficeWorld } from "@/components/ai-office/AiOfficeWorld";
import { getSupabaseServerSession } from "@/lib/supabase/session";

export const metadata: Metadata = {
  title: "AI Office | 취향보관소",
  description: "장소를 클릭해 캐릭터를 이동시키는 로그인 전용 Pixel Agents 오피스",
  robots: { index: false, follow: false },
};

export default async function AiOfficePage() {
  const { user } = await getSupabaseServerSession();

  if (!user) {
    redirect(loginHref("/ai-office"));
  }

  return (
    <main className="min-h-screen bg-[#eef1ed]">
      <section className="mx-auto w-full max-w-[1800px]">
        <AppNav active="ai-office" />
        <AiOfficeWorld />
      </section>
    </main>
  );
}
