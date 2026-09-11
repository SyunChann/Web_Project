import { BarChart3, CalendarDays } from "lucide-react";
import { AppNav } from "@/components/AppNav";
import { ContentSectionTabs } from "@/components/ContentSectionTabs";
import { LckDraftDashboard } from "@/components/lck/LckDraftDashboard";

export const metadata = { title: "LCK 드래프트 분석" };

export default function LckAnalysisPage() {
  return <main className="min-h-screen"><section className="mx-auto w-full max-w-6xl"><AppNav active="reviews" showAuth={false} /><header className="py-10"><ContentSectionTabs active="lol" /><p className="flex items-center gap-2 text-sm font-black tracking-wide text-[#e32732]"><BarChart3 size={16} /> LCK DRAFT LAB</p><div className="mt-3 flex flex-wrap items-end justify-between gap-5"><div><h1 className="text-3xl font-black tracking-tight text-[#13233d] sm:text-5xl">LCK 패치별 밴픽 분석</h1><p className="mt-3 max-w-2xl leading-7 text-[#52616b]">한 게임의 패치 버전과 드래프트를 기준으로 챔피언 존재감, 픽 승률, 팀 성과와 조합을 비교합니다.</p></div><a href="/lck-calendar" className="inline-flex items-center gap-2 rounded-lg border border-[#cbd6e6] bg-white px-4 py-2.5 text-sm font-black text-[#334155] transition hover:border-[#e32732] hover:text-[#e32732]"><CalendarDays size={16} /> 경기 캘린더</a></div></header><LckDraftDashboard /></section></main>;
}
