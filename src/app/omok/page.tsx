import { Swords } from "lucide-react";
import { AppNav } from "@/components/AppNav";
import { createOmokRoom, joinOmokRoom } from "@/app/actions/omok";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type RoomSummary = {
  id: string;
  black_player_name: string;
  white_player_name: string | null;
  status: "waiting" | "playing" | "finished";
};
type FinishedRoom = { id: string; black_player_id: string; white_player_id: string | null; black_player_name: string; white_player_name: string | null; winner: "black" | "white" | "draw" | null; finish_reason: string | null; updated_at: string };

export default async function OmokPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  const [{ data: rooms }, { data: finished }] = supabase
    ? await Promise.all([
      supabase.from("omok_rooms").select("id, black_player_name, white_player_name, status").in("status", ["waiting", "playing"]).order("created_at", { ascending: false }).limit(20),
      user
        ? supabase.from("omok_rooms").select("id, black_player_id, white_player_id, black_player_name, white_player_name, winner, finish_reason, updated_at").eq("status", "finished").or(`black_player_id.eq.${user.id},white_player_id.eq.${user.id}`).order("updated_at", { ascending: false }).limit(20)
        : Promise.resolve({ data: [] as FinishedRoom[] }),
    ])
    : [{ data: [] }, { data: [] }];
  const openRooms = (rooms ?? []) as RoomSummary[];
  const history = (finished ?? []) as FinishedRoom[];
  const record = history.reduce((total, room) => {
    const mine = room.black_player_id === user?.id ? "black" : "white";
    if (room.winner === "draw") total.draws += 1;
    else if (room.winner === mine) total.wins += 1;
    else total.losses += 1;
    return total;
  }, { wins: 0, losses: 0, draws: 0 });
  const totalGames = record.wins + record.losses + record.draws;
  const winRate = totalGames ? Math.round((record.wins / totalGames) * 100) : 0;

  return <main className="min-h-screen"><section className="mx-auto w-full max-w-6xl"><AppNav active="games" /><header className="py-10"><p className="text-sm font-bold text-[#b45309]">MINI GAME</p><h1 className="mt-3 flex items-center gap-3 text-3xl font-black text-[#17202a] sm:text-4xl"><Swords className="text-[#b45309]" />온라인 오목</h1><p className="mt-4 text-[#52616b]">방을 만들거나 대기 중인 방에 입장해 실시간으로 대국하세요.</p></header>
    {user ? <section className="mb-6 border border-[#ddd6cc] bg-white p-5 shadow-sm"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-bold text-[#b45309]">MY RECORD</p><h2 className="mt-1 text-xl font-black text-[#17202a]">내 전적</h2></div><p className="text-sm font-bold text-[#52616b]">승률 <strong className="ml-1 text-xl text-[#b45309]">{winRate}%</strong></p></div><div className="mt-4 grid grid-cols-3 divide-x divide-[#eee8df] border-t border-[#eee8df] pt-4 text-center"><div><p className="text-xs font-bold text-[#64748b]">승</p><p className="mt-1 text-xl font-black text-[#15803d]">{record.wins}</p></div><div><p className="text-xs font-bold text-[#64748b]">패</p><p className="mt-1 text-xl font-black text-[#b42318]">{record.losses}</p></div><div><p className="text-xs font-bold text-[#64748b]">무</p><p className="mt-1 text-xl font-black text-[#52616b]">{record.draws}</p></div></div>{history.length ? <ul className="mt-5 divide-y divide-[#eee8df] border-t border-[#eee8df]">{history.slice(0, 5).map((room) => <li key={room.id} className="flex items-center justify-between gap-3 py-3 text-sm"><span className="font-semibold text-[#334155]">{room.black_player_name} vs {room.white_player_name}</span><span className="font-bold text-[#52616b]">{room.winner === "draw" ? "무승부" : room.winner === (room.black_player_id === user.id ? "black" : "white") ? "승리" : "패배"}</span></li>)}</ul> : <p className="mt-5 border-t border-[#eee8df] pt-4 text-sm text-[#64748b]">완료된 대국이 아직 없습니다.</p>}</section> : null}
    <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_17rem]"><div className="border border-[#ddd6cc] bg-white shadow-sm"><div className="flex items-center justify-between border-b border-[#eee8df] px-5 py-4"><h2 className="font-black text-[#17202a]">대국 목록</h2><span className="text-sm font-semibold text-[#64748b]">{openRooms.length}개 방</span></div>{openRooms.length ? <ul className="divide-y divide-[#eee8df]">{openRooms.map((room) => <li key={room.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"><div><p className="font-bold text-[#17202a]">{room.black_player_name} {room.white_player_name ? `vs ${room.white_player_name}` : "님이 상대를 기다리는 중"}</p><p className="mt-1 text-sm text-[#64748b]">{room.status === "waiting" ? "입장 가능" : "대국 진행 중"}</p></div>{room.status === "waiting" && user ? <form action={joinOmokRoom.bind(null, room.id)}><button className="border border-[#b45309] px-3 py-2 text-sm font-bold text-[#b45309] transition hover:bg-[#fff7ed]">입장</button></form> : <a href={`/omok/${room.id}`} className="border border-[#d8cfc2] px-3 py-2 text-sm font-bold text-[#52616b]">관전</a>}</li>)}</ul> : <p className="p-8 text-center text-sm text-[#64748b]">아직 열린 대국이 없습니다.</p>}</div><aside className="self-start border border-[#ddd6cc] bg-white p-5 shadow-sm"><h2 className="font-black text-[#17202a]">새 대국</h2><p className="mt-2 text-sm leading-6 text-[#52616b]">첫 수는 흑돌입니다. 상대가 입장할 때까지 기다립니다.</p>{user ? <form action={createOmokRoom}><button className="mt-5 w-full bg-[#b45309] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#92400e]">방 만들기</button></form> : <a href="/login" className="mt-5 block w-full bg-[#b45309] px-4 py-2.5 text-center text-sm font-bold text-white">로그인 후 대국하기</a>}</aside></section>
  </section></main>;
}
