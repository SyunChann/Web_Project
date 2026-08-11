"use server";

import { randomUUID } from "crypto";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const BOARD_SIZE = 15;
const TURN_LIMIT_MS = 30_000;
type Stone = "black" | "white";
type Board = (Stone | null)[][];

type OmokRoom = {
  id: string;
  black_player_id: string;
  white_player_id: string | null;
  black_player_name: string;
  white_player_name: string | null;
  board: unknown;
  turn: Stone;
  status: "waiting" | "playing" | "finished";
  move_count: number;
  turn_started_at: string | null;
  draw_offer_by: string | null;
  rematch_requested_by: string | null;
  rematch_room_id: string | null;
};

async function requireUser() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/login?error=config");

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

function playerName(user: { email?: string | null; user_metadata?: Record<string, unknown> }) {
  const name = user.user_metadata?.display_name ?? user.user_metadata?.name;
  return typeof name === "string" && name.trim()
    ? name.trim()
    : user.email?.split("@")[0] ?? "Player";
}

function emptyBoard(): Board {
  return Array.from({ length: BOARD_SIZE }, () => Array<Stone | null>(BOARD_SIZE).fill(null));
}

async function findActiveOmokRoomId(
  supabase: NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>,
  userId: string,
) {
  const { data, error } = await supabase.from("omok_rooms")
    .select("id")
    .in("status", ["waiting", "playing"])
    .or(`black_player_id.eq.${userId},white_player_id.eq.${userId}`)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data?.id ?? null;
}

function parseBoard(value: unknown): Board {
  if (!Array.isArray(value) || value.length !== BOARD_SIZE) return emptyBoard();
  return value.map((row) => Array.isArray(row) && row.length === BOARD_SIZE
    ? row.map((cell) => cell === "black" || cell === "white" ? cell : null)
    : Array<Stone | null>(BOARD_SIZE).fill(null));
}

function hasFive(board: Board, row: number, col: number, stone: Stone) {
  const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
  return directions.some(([rowDelta, colDelta]) => {
    let count = 1;
    for (const sign of [-1, 1]) {
      let nextRow = row + rowDelta * sign;
      let nextCol = col + colDelta * sign;
      while (
        nextRow >= 0 && nextRow < BOARD_SIZE && nextCol >= 0 && nextCol < BOARD_SIZE &&
        board[nextRow][nextCol] === stone
      ) {
        count += 1;
        nextRow += rowDelta * sign;
        nextCol += colDelta * sign;
      }
    }
    return count >= 5;
  });
}

export async function createOmokRoom() {
  const { supabase, user } = await requireUser();
  const activeRoomId = await findActiveOmokRoomId(supabase, user.id);
  if (activeRoomId) redirect(`/omok/${activeRoomId}`);
  const id = randomUUID();
  const { error } = await supabase.from("omok_rooms").insert({
    id,
    black_player_id: user.id,
    black_player_name: playerName(user),
    board: emptyBoard(),
  });
  if (error) throw new Error(error.message);
  redirect(`/omok/${id}`);
}

export async function joinOmokRoom(roomId: string) {
  const { supabase, user } = await requireUser();
  const activeRoomId = await findActiveOmokRoomId(supabase, user.id);
  if (activeRoomId) redirect(`/omok/${activeRoomId}`);
  const { data: room, error } = await supabase
    .from("omok_rooms")
    .select("black_player_id, white_player_id, status")
    .eq("id", roomId)
    .maybeSingle();
  if (error || !room) throw new Error("The game room no longer exists.");

  if (room.black_player_id === user.id || room.white_player_id === user.id) {
    redirect(`/omok/${roomId}`);
  }
  if (room.status !== "waiting" || room.white_player_id) {
    throw new Error("This room already has two players.");
  }

  const { data: joined, error: joinError } = await supabase
    .from("omok_rooms")
    .update({
      white_player_id: user.id,
      white_player_name: playerName(user),
      status: "playing",
      turn_started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", roomId)
    .eq("status", "waiting")
    .is("white_player_id", null)
    .select("id")
    .maybeSingle();
  if (joinError) throw new Error(joinError.message);
  if (!joined) throw new Error("Another player joined this room first.");
  redirect(`/omok/${roomId}`);
}

export async function playOmokMove(roomId: string, row: number, col: number) {
  const { supabase, user } = await requireUser();
  if (!Number.isInteger(row) || !Number.isInteger(col) || row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) {
    throw new Error("Invalid board position.");
  }

  const { data, error } = await supabase.from("omok_rooms").select("*").eq("id", roomId).maybeSingle();
  const room = data as OmokRoom | null;
  if (error || !room) throw new Error("The game room no longer exists.");
  if (room.status !== "playing") throw new Error("The game has not started or is already finished.");

  const stone: Stone | null = room.black_player_id === user.id
    ? "black"
    : room.white_player_id === user.id ? "white" : null;
  if (!stone) throw new Error("Only players in this room can place a stone.");
  if (room.turn !== stone) throw new Error("It is not your turn.");
  if (room.turn_started_at && Date.now() - new Date(room.turn_started_at).getTime() >= TURN_LIMIT_MS) {
    await finishTimedOutRoom(supabase, room);
    throw new Error("Your turn has expired.");
  }

  const board = parseBoard(room.board);
  if (board[row][col]) throw new Error("A stone is already placed there.");
  board[row][col] = stone;
  const moveCount = room.move_count + 1;
  const winner = hasFive(board, row, col, stone) ? stone : null;
  const isDraw = !winner && moveCount === BOARD_SIZE * BOARD_SIZE;

  const { data: updated, error: updateError } = await supabase
    .from("omok_rooms")
    .update({
      board,
      turn: stone === "black" ? "white" : "black",
      status: winner || isDraw ? "finished" : "playing",
      winner: winner ?? (isDraw ? "draw" : null),
      finish_reason: winner ? "five" : isDraw ? "draw" : null,
      draw_offer_by: null,
      move_count: moveCount,
      last_move_row: row,
      last_move_col: col,
      turn_started_at: winner || isDraw ? null : new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", roomId)
    .eq("move_count", room.move_count)
    .select("id")
    .maybeSingle();

  if (updateError) throw new Error(updateError.message);
  if (!updated) throw new Error("The board changed. Please try again.");
}

function playerStone(room: OmokRoom, userId: string): Stone | null {
  return room.black_player_id === userId ? "black" : room.white_player_id === userId ? "white" : null;
}

async function getRoomOrThrow(
  supabase: NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>,
  roomId: string,
) {
  const { data, error } = await supabase.from("omok_rooms").select("*").eq("id", roomId).maybeSingle();
  const room = data as OmokRoom | null;
  if (error || !room) throw new Error("The game room no longer exists.");
  return room;
}

async function finishTimedOutRoom(
  supabase: NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>,
  room: OmokRoom,
) {
  const winner: Stone = room.turn === "black" ? "white" : "black";
  const { error } = await supabase.from("omok_rooms").update({
    status: "finished", winner, finish_reason: "timeout", turn_started_at: null,
    draw_offer_by: null, updated_at: new Date().toISOString(),
  }).eq("id", room.id).eq("status", "playing").eq("turn", room.turn);
  if (error) throw new Error(error.message);
}

export async function claimOmokTimeout(roomId: string) {
  const { supabase } = await requireUser();
  const room = await getRoomOrThrow(supabase, roomId);
  if (room.status !== "playing" || !room.turn_started_at) return;
  if (Date.now() - new Date(room.turn_started_at).getTime() < TURN_LIMIT_MS) return;
  await finishTimedOutRoom(supabase, room);
}

export async function resignOmokGame(roomId: string) {
  const { supabase, user } = await requireUser();
  const room = await getRoomOrThrow(supabase, roomId);
  const stone = playerStone(room, user.id);
  if (!stone || room.status !== "playing") throw new Error("You cannot resign from this game.");
  const { error } = await supabase.from("omok_rooms").update({
    status: "finished", winner: stone === "black" ? "white" : "black", finish_reason: "resign",
    turn_started_at: null, draw_offer_by: null, updated_at: new Date().toISOString(),
  }).eq("id", roomId).eq("status", "playing");
  if (error) throw new Error(error.message);
}

export async function offerOmokDraw(roomId: string) {
  const { supabase, user } = await requireUser();
  const room = await getRoomOrThrow(supabase, roomId);
  if (!playerStone(room, user.id) || room.status !== "playing") throw new Error("Only players can offer a draw.");
  if (room.draw_offer_by && room.draw_offer_by !== user.id) {
    const { error } = await supabase.from("omok_rooms").update({
      status: "finished", winner: "draw", finish_reason: "agreement", draw_offer_by: null,
      turn_started_at: null, updated_at: new Date().toISOString(),
    }).eq("id", roomId).eq("status", "playing");
    if (error) throw new Error(error.message);
    return { accepted: true };
  }
  const { error } = await supabase.from("omok_rooms").update({
    draw_offer_by: room.draw_offer_by === user.id ? null : user.id,
    updated_at: new Date().toISOString(),
  }).eq("id", roomId).eq("status", "playing");
  if (error) throw new Error(error.message);
  return { accepted: false };
}

export async function requestOmokRematch(roomId: string) {
  const { supabase, user } = await requireUser();
  const activeRoomId = await findActiveOmokRoomId(supabase, user.id);
  if (activeRoomId) return { roomId: activeRoomId };
  const room = await getRoomOrThrow(supabase, roomId);
  if (!playerStone(room, user.id) || room.status !== "finished" || !room.white_player_id || !room.white_player_name) {
    throw new Error("Only completed two-player games can be replayed.");
  }
  if (room.rematch_room_id) return { roomId: room.rematch_room_id };
  if (room.rematch_requested_by && room.rematch_requested_by !== user.id) {
    const id = randomUUID();
    const { error: createError } = await supabase.from("omok_rooms").insert({
      id, black_player_id: room.white_player_id, black_player_name: room.white_player_name,
      white_player_id: room.black_player_id, white_player_name: room.black_player_name,
      board: emptyBoard(), status: "playing", turn_started_at: new Date().toISOString(),
    });
    if (createError) throw new Error(createError.message);
    const { error: linkError } = await supabase.from("omok_rooms").update({ rematch_room_id: id, updated_at: new Date().toISOString() }).eq("id", roomId).is("rematch_room_id", null);
    if (linkError) throw new Error(linkError.message);
    return { roomId: id };
  }
  const { error } = await supabase.from("omok_rooms").update({
    rematch_requested_by: room.rematch_requested_by === user.id ? null : user.id,
    updated_at: new Date().toISOString(),
  }).eq("id", roomId).eq("status", "finished");
  if (error) throw new Error(error.message);
  return { roomId: null };
}
