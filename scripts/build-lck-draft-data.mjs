import { readFile, writeFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";

const sourcePath = process.argv[2];
if (!sourcePath) throw new Error("Usage: node scripts/build-lck-draft-data.mjs <teams.csv.gz>");

const csv = gunzipSync(await readFile(sourcePath)).toString("utf8").trim();
const [header, ...lines] = csv.split(/\r?\n/);
const keys = header.split(",");
const get = (row, key) => row[keys.indexOf(key)] ?? "";
const gamesById = new Map();

for (const line of lines) {
  const row = line.split(",");
  if (get(row, "league") !== "LCK" || get(row, "year") !== "2026") continue;
  const id = get(row, "game_id");
  if (!id) continue;
  const date = get(row, "date").slice(0, 10);
  const teams = [get(row, "team_name"), get(row, "opponent_team_name")].sort();
  const game = gamesById.get(id) ?? { id, date, patch: get(row, "patch"), split: get(row, "split") || "Season", stage: get(row, "playoffs") === "TRUE" ? "playoffs" : "regular", seriesId: `${date}|${teams.join("|")}`, gameNumber: Number(get(row, "game_number")) || 1 };
  game[get(row, "side").toLowerCase()] = {
    team: get(row, "team_name"), won: get(row, "result") === "TRUE",
    bans: ["ban1", "ban2", "ban3", "ban4", "ban5"].map((key) => get(row, key)).filter(Boolean),
    picks: ["pick1", "pick2", "pick3", "pick4", "pick5"].map((key) => get(row, key)).filter(Boolean),
  };
  gamesById.set(id, game);
}

const games = [...gamesById.values()].filter((game) => game.blue?.picks.length === 5 && game.red?.picks.length === 5).sort((a, b) => a.date.localeCompare(b.date));
const output = new URL("../src/data/lckDraftGames.json", import.meta.url);
await writeFile(output, `${JSON.stringify({ source: "ChainCC League of Legends esports match dataset (CC BY 4.0)", sourceUrl: "https://chaincc.lol/free/data", updatedAt: new Date().toISOString(), season: 2026, games })}\n`);
console.log(`Wrote ${games.length} LCK games.`);
