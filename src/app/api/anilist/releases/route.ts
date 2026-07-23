import { NextRequest, NextResponse } from "next/server";
import {
  getAniListQuarterReleases,
  getCurrentAniListQuarter,
  type AniListQuarter,
} from "@/data/anilist";

function parseQuarter(value: string | null) {
  const quarter = Number(value);

  return quarter >= 1 && quarter <= 4
    ? quarter as AniListQuarter
    : getCurrentAniListQuarter();
}

function parseYear(value: string | null) {
  const year = Number(value);

  return Number.isInteger(year) && year >= 2000 && year <= 2100
    ? year
    : new Date().getFullYear();
}

export async function GET(request: NextRequest) {
  const year = parseYear(request.nextUrl.searchParams.get("year"));
  const quarter = parseQuarter(request.nextUrl.searchParams.get("quarter"));
  const items = await getAniListQuarterReleases(year, quarter);

  return NextResponse.json({ year, quarter, items });
}
