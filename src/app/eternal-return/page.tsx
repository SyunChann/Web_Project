import { Crosshair, ExternalLink } from "lucide-react";
import { AppNav } from "@/components/AppNav";
import { EternalReturnSearch } from "@/components/eternal-return/EternalReturnSearch";

export const metadata = { title: "이터널 리턴 전적검색" };

export default function EternalReturnPage() { return <main className="min-h-screen px-4 py-6 sm:px-10 sm:py-8"><section className="mx-auto w-full max-w-5xl"><AppNav active="games" /><header className="mt-8 rounded-2xl bg-gradient-to-br from-[#312e81] via-[#4338ca] to-[#0f172a] px-6 py-8 text-white shadow-lg sm:px-10 sm:py-10"><p className="flex items-center gap-2 text-sm font-black tracking-widest text-[#c7d2fe]"><Crosshair size={17} /> ETERNAL RETURN</p><h1 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">이터널 리턴 전적검색</h1><p className="mt-3 max-w-2xl leading-7 text-[#e0e7ff]">닉네임으로 최근 매치와 시즌 성적을 확인하세요. 데이터는 이터널 리턴 공식 Open API에서 가져옵니다.</p></header><EternalReturnSearch /><p className="mt-6 text-center text-xs leading-5 text-[#64748b]">전적은 최근 90일 기준이며, 닉네임 변경 전 기록은 조회되지 않을 수 있습니다. <a className="inline-flex items-center gap-1 font-bold text-[#4338ca] underline" href="https://developer.eternalreturn.io/" target="_blank" rel="noreferrer">공식 개발자 포털 <ExternalLink size={12} /></a></p></section></main>; }
