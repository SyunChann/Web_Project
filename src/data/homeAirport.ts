import "server-only";
import { getDepartureCongestion } from "@/lib/incheonCongestion";

export async function getHomeAirportSnapshot() {
  const results = await Promise.allSettled([getDepartureCongestion("T1"), getDepartureCongestion("T2")]);
  return { terminals: results.map((result) => result.status === "fulfilled" ? result.value : undefined), now: Date.now() };
}
