import { notFound } from "next/navigation";
import Link from "next/link";
import { AppNav } from "@/components/AppNav";
import { OmokGame, type OmokRoomState } from "@/components/omok/OmokGame";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function OmokRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const supabase = await createSupabaseServerClient(); if (!supabase) notFound();
  const [{ data: room }, { data: { user } }] = await Promise.all([supabase.from("omok_rooms").select("*").eq("id", id).maybeSingle(), supabase.auth.getUser()]);
  if (!room) notFound();
  return <main className="min-h-screen"><section className="mx-auto w-full max-w-6xl"><AppNav active="games" /><header className="flex items-end justify-between gap-4 py-8"><div><p className="text-sm font-bold text-[#b45309]">ONLINE OMOK</p><h1 className="mt-2 text-3xl font-black text-[#17202a]">오목 대국</h1></div><Link href="/omok" className="border border-[#d8cfc2] bg-white px-3 py-2 text-sm font-bold text-[#52616b]">대국 목록</Link></header><OmokGame initialRoom={room as OmokRoomState} userId={user?.id ?? null} /></section></main>;
}
