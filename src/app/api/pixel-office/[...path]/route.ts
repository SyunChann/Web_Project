import { createSupabaseServerClient } from "@/lib/supabase/server";

const agents = [
  { id: 0, name: "SYUN", role: "Owner", color: 0, x: 144, y: 240, state: "idle", active: true },
  { id: 1, name: "DEV", role: "Developer", color: 1, x: 336, y: 688, state: "working", active: true },
  { id: 2, name: "PLAN", role: "Planner", color: 2, x: 272, y: 464, state: "reading", active: true },
  { id: 3, name: "MATE", role: "Assistant", color: 3, x: 528, y: 688, state: "drinking", active: true },
  { id: 4, name: "Agent 5", role: "", color: 4, x: 176, y: 656, state: "idle", active: false },
  { id: 5, name: "Agent 6", role: "", color: 5, x: 496, y: 464, state: "idle", active: false },
];

const rooms = [
  { id: 1, name: "게임룸", tiles: [{ x: 4, y: 7 }, { x: 5, y: 7 }, { x: 3, y: 6 }] },
  { id: 2, name: "휴식 공간", tiles: [{ x: 15, y: 7 }, { x: 16, y: 7 }, { x: 17, y: 6 }] },
  { id: 3, name: "기획팀", tiles: [{ x: 8, y: 13 }, { x: 11, y: 13 }, { x: 11, y: 14 }] },
  { id: 4, name: "회의실", tiles: [{ x: 13, y: 13 }, { x: 18, y: 13 }, { x: 18, y: 14 }] },
  { id: 5, name: "개발팀", tiles: [{ x: 8, y: 20 }, { x: 10, y: 20 }, { x: 11, y: 21 }] },
  { id: 6, name: "오피스 카페", tiles: [{ x: 13, y: 20 }, { x: 17, y: 20 }, { x: 18, y: 22 }] },
];

type PixelOfficeContext = { params: Promise<{ path: string[] }> };

async function isAuthenticated() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return false;
  const { data: { user } } = await supabase.auth.getUser();
  return Boolean(user);
}
export async function GET(_request: Request, { params }: PixelOfficeContext) {
  if (!(await isAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const path = (await params).path;
  const endpoint = path.join("/");

  if (endpoint === "config") return Response.json({ agents, rooms });
  if (endpoint === "rooms") return Response.json(rooms);
  if (endpoint === "collision") return Response.json(null);
  if (endpoint === "messages") return Response.json({});
  if (endpoint === "log") return Response.json([]);
  if (/^agent\/\d+\/command$/.test(endpoint)) return Response.json(null);

  return Response.json({ error: "Not found" }, { status: 404 });
}

export async function POST(request: Request, { params }: PixelOfficeContext) {
  if (!(await isAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const endpoint = (await params).path.join("/");
  if (endpoint === "config") {
    const config = await request.json().catch(() => ({ agents, rooms }));
    return Response.json({ success: true, config });
  }
  return Response.json({ success: true });
}
