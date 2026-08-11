"use client";

import { Fragment, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  claimOmokTimeout,
  createOmokRoom,
  offerOmokDraw,
  playOmokMove,
  requestOmokRematch,
  resignOmokGame,
} from "@/app/actions/omok";
import { createSupabasePublicClient } from "@/lib/supabase/public";

const BOARD_SIZE = 15;
type Stone = "black" | "white";
type Board = (Stone | null)[][];

export type OmokRoomState = {
  id: string;
  black_player_id: string;
  black_player_name: string;
  white_player_id: string | null;
  white_player_name: string | null;
  board: unknown;
  turn: Stone;
  status: "waiting" | "playing" | "finished";
  winner: Stone | "draw" | null;
  move_count: number;
  last_move_row: number | null;
  last_move_col: number | null;
  turn_started_at: string | null;
  finish_reason: "five" | "draw" | "agreement" | "resign" | "timeout" | null;
  draw_offer_by: string | null;
  rematch_requested_by: string | null;
  rematch_room_id: string | null;
};

function normalizeBoard(value: unknown): Board {
  if (!Array.isArray(value) || value.length !== BOARD_SIZE) return emptyBoard();
  return value.map((row) => Array.isArray(row) && row.length === BOARD_SIZE
    ? row.map((cell) => cell === "black" || cell === "white" ? cell : null)
    : Array<Stone | null>(BOARD_SIZE).fill(null));
}

function emptyBoard(): Board {
  return Array.from({ length: BOARD_SIZE }, () => Array<Stone | null>(BOARD_SIZE).fill(null));
}

export function OmokGame({ initialRoom, userId }: { initialRoom: OmokRoomState; userId: string | null }) {
  const [room, setRoom] = useState(initialRoom);
  const [error, setError] = useState("");
  const [now, setNow] = useState(0);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    const supabase = createSupabasePublicClient();
    if (!supabase) return;
    const channel = supabase.channel(`omok-room-${initialRoom.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "omok_rooms", filter: `id=eq.${initialRoom.id}` }, (payload) => setRoom(payload.new as OmokRoomState))
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [initialRoom.id]);
  useEffect(() => {
    if (room.status !== "playing" || !room.turn_started_at) return;
    const interval = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(interval);
  }, [room.status, room.turn_started_at]);

  const board = useMemo(() => normalizeBoard(room.board), [room.board]);
  const myStone: Stone | null = room.black_player_id === userId ? "black" : room.white_player_id === userId ? "white" : null;
  const canPlay = room.status === "playing" && room.turn === myStone;
  const secondsLeft = now && room.turn_started_at
    ? Math.max(0, Math.ceil((new Date(room.turn_started_at).getTime() + 30_000 - now) / 1_000))
    : 30;
  const statusText = room.status === "waiting"
    ? "상대를 기다리고 있습니다"
    : room.status === "finished"
      ? room.winner === "draw" ? "무승부입니다" : `${room.winner === "black" ? room.black_player_name : room.white_player_name} 님의 승리입니다`
      : canPlay ? "내 차례입니다" : "상대의 차례입니다";

  function placeStone(row: number, col: number) {
    if (!canPlay || board[row][col] || isPending) return;
    setError("");
    startTransition(async () => {
      try {
        await playOmokMove(room.id, row, col);
        router.refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "수를 둘 수 없습니다.");
        router.refresh();
      }
    });
  }

  function runAction(action: () => Promise<unknown>) {
    setError("");
    startTransition(async () => {
      try {
        const result = await action();
        if (typeof result === "object" && result && "roomId" in result && typeof result.roomId === "string") {
          router.push(`/omok/${result.roomId}`);
        } else router.refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "요청을 처리할 수 없습니다.");
      }
    });
  }

  useEffect(() => {
    if (!userId || room.status !== "playing" || secondsLeft > 0) return;
    const timeout = window.setTimeout(() => {
      void claimOmokTimeout(room.id).then(() => router.refresh());
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [room.id, room.status, secondsLeft, router, userId]);

  return <>
    <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="min-w-0">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div><p className="text-sm font-bold text-[#b45309]">{statusText}</p><p className="mt-1 text-sm text-[#52616b]">{room.move_count}수 진행</p></div>
          {myStone ? <span className={`rounded-md px-3 py-1.5 text-sm font-bold ${myStone === "black" ? "bg-[#17202a] text-white" : "border border-[#cbd5df] bg-white text-[#334155]"}`}>{myStone === "black" ? "흑" : "백"}</span> : <span className="rounded-md bg-[#f1f5f9] px-3 py-1.5 text-sm font-bold text-[#52616b]">관전 중</span>}
        </div>
        {room.status === "playing" ? <div className="mb-4 flex items-center justify-between border border-[#ddd6cc] bg-white px-4 py-3 text-sm"><span className="font-bold text-[#52616b]">{room.turn === "black" ? room.black_player_name : room.white_player_name} 님의 제한 시간</span><strong className={secondsLeft <= 10 ? "text-[#b42318]" : "text-[#b45309]"}>{secondsLeft}초</strong></div> : null}
        <div className="mx-auto w-full max-w-[680px] border border-[#9c6b35] bg-[#d9ad68] p-2 shadow-sm sm:p-3">
          <div className="relative m-[3.6%] aspect-square">
            {Array.from({ length: BOARD_SIZE }, (_, index) => <Fragment key={index}>
              <span aria-hidden="true" className="pointer-events-none absolute left-0 right-0 h-px bg-[#78501f]" style={{ top: `${(index / (BOARD_SIZE - 1)) * 100}%` }} />
              <span aria-hidden="true" className="pointer-events-none absolute bottom-0 top-0 w-px bg-[#78501f]" style={{ left: `${(index / (BOARD_SIZE - 1)) * 100}%` }} />
            </Fragment>)}
            {board.map((boardRow, row) => boardRow.map((stone, col) => <button
              key={`${row}-${col}`} type="button" onClick={() => placeStone(row, col)}
              disabled={!canPlay || Boolean(stone) || isPending} aria-label={`${row + 1}행 ${col + 1}열`}
              className="absolute z-10 flex h-[7.15%] w-[7.15%] -translate-x-1/2 -translate-y-1/2 items-center justify-center disabled:cursor-default"
              style={{ top: `${(row / (BOARD_SIZE - 1)) * 100}%`, left: `${(col / (BOARD_SIZE - 1)) * 100}%` }}
            >{stone ? <span className={`relative block h-[72%] w-[72%] rounded-full border shadow-sm ${stone === "black" ? "border-[#020617] bg-[#111827]" : "border-[#cbd5e1] bg-[#f8fafc]"}`}>{room.last_move_row === row && room.last_move_col === col ? <span className={`absolute inset-[38%] rounded-full ${stone === "black" ? "bg-[#fbbf24]" : "bg-[#dc2626]"}`} /> : null}</span> : null}</button>))}
          </div>
        </div>
        {error ? <p role="alert" className="mt-3 text-sm font-semibold text-[#b42318]">{error}</p> : null}
      </div>
      <aside className="self-start border border-[#ddd6cc] bg-white p-5 shadow-sm"><h2 className="text-lg font-black text-[#17202a]">대국 정보</h2><div className="mt-5 space-y-3"><Player label="흑" name={room.black_player_name} stone="black" active={room.turn === "black" && room.status === "playing"} /><Player label="백" name={room.white_player_name ?? "입장 대기"} stone="white" active={room.turn === "white" && room.status === "playing"} /></div>{room.status === "playing" && myStone ? <div className="mt-5 grid grid-cols-2 gap-2 border-t border-[#eee8df] pt-4"><button type="button" onClick={() => runAction(() => offerOmokDraw(room.id))} disabled={isPending} className="border border-[#d8cfc2] px-2 py-2 text-sm font-bold text-[#52616b] hover:border-[#b45309] hover:text-[#b45309]">{room.draw_offer_by && room.draw_offer_by !== userId ? "무승부 수락" : room.draw_offer_by ? "제안 취소" : "무승부 제안"}</button><button type="button" onClick={() => runAction(() => resignOmokGame(room.id))} disabled={isPending} className="border border-[#f0b8ae] px-2 py-2 text-sm font-bold text-[#b42318] hover:bg-[#fff5f4]">기권</button></div> : null}{room.status === "playing" && room.draw_offer_by ? <p className="mt-3 text-xs font-bold text-[#b45309]">{room.draw_offer_by === userId ? "상대의 무승부 수락을 기다립니다." : "상대가 무승부를 제안했습니다."}</p> : null}<p className="mt-6 border-t border-[#eee8df] pt-4 text-sm leading-6 text-[#52616b]">한 수당 30초입니다. 가로, 세로, 대각선 중 같은 돌 다섯 개를 먼저 놓으면 승리합니다.</p></aside>
    </section>
    {room.status === "finished" ? <GameResultDialog room={room} userId={userId} onRematch={() => runAction(() => requestOmokRematch(room.id))} isPending={isPending} /> : null}
  </>;
}

function GameResultDialog({ room, userId, onRematch, isPending }: { room: OmokRoomState; userId: string | null; onRematch: () => void; isPending: boolean }) {
  const title = room.winner === "draw" ? "무승부" : "대국 종료";
  const reason = room.finish_reason === "resign" ? "상대가 기권했습니다." : room.finish_reason === "timeout" ? "제한 시간이 만료되었습니다." : room.finish_reason === "agreement" ? "양쪽이 무승부에 합의했습니다." : room.winner === "draw" ? "판이 모두 채워졌습니다." : `${room.winner === "black" ? room.black_player_name : room.white_player_name} 님이 승리했습니다.`;
  const isPlayer = room.black_player_id === userId || room.white_player_id === userId;
  const rematchText = room.rematch_room_id ? "재대국 방으로 이동" : room.rematch_requested_by && room.rematch_requested_by !== userId ? "재대국 수락" : room.rematch_requested_by ? "재대국 요청 취소" : "재대국 요청";
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#17202a]/45 p-4" role="dialog" aria-modal="true" aria-labelledby="omok-result-title"><section className="w-full max-w-sm border border-[#d8cfc2] bg-white p-6 shadow-xl"><p className="text-sm font-bold text-[#b45309]">OMOK RESULT</p><h2 id="omok-result-title" className="mt-2 text-2xl font-black text-[#17202a]">{title}</h2><p className="mt-3 text-[#52616b]">{reason}</p>{isPlayer ? <button type="button" onClick={onRematch} disabled={isPending} className="mt-5 w-full border border-[#b45309] px-3 py-2.5 text-sm font-bold text-[#b45309] hover:bg-[#fff7ed]">{rematchText}</button> : null}{room.rematch_requested_by ? <p className="mt-3 text-center text-xs font-bold text-[#b45309]">{room.rematch_requested_by === userId ? "상대의 응답을 기다리고 있습니다." : "상대가 재대국을 요청했습니다."}</p> : null}<div className="mt-3 grid grid-cols-2 gap-2"><Link href="/omok" className="border border-[#d8cfc2] px-3 py-2.5 text-center text-sm font-bold text-[#52616b] transition hover:border-[#b45309] hover:text-[#b45309]">대국 목록</Link>{userId ? <form action={createOmokRoom}><button className="w-full bg-[#b45309] px-3 py-2.5 text-sm font-bold text-white transition hover:bg-[#92400e]">새 대국</button></form> : <Link href="/login" className="bg-[#b45309] px-3 py-2.5 text-center text-sm font-bold text-white">로그인</Link>}</div></section></div>;
}

function Player({ label, name, stone, active }: { label: string; name: string; stone: Stone; active: boolean }) {
  return <div className="flex items-center justify-between border-l-4 border-[#94a3b8] bg-[#f8fafc] px-3 py-2 text-sm"><span className="font-bold text-[#52616b]">{label}</span><span className="flex items-center gap-2 font-bold text-[#17202a]"><i className={`block h-3 w-3 rounded-full ${stone === "black" ? "bg-[#111827]" : "border border-[#94a3b8] bg-white"}`} />{name}{active ? <i className="h-2 w-2 rounded-full bg-[#16a34a]" /> : null}</span></div>;
}
