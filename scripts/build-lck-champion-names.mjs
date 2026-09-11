import { readFile, writeFile } from "node:fs/promises";

const [englishPath, koreanPath] = process.argv.slice(2);
if (!englishPath || !koreanPath) throw new Error("Usage: node scripts/build-lck-champion-names.mjs <en champion.json> <ko champion.json>");

const english = JSON.parse(await readFile(englishPath, "utf8"));
const korean = JSON.parse(await readFile(koreanPath, "utf8"));
const names = Object.fromEntries(Object.keys(english.data).map((id) => [english.data[id].name, korean.data[id]?.name ?? english.data[id].name]).sort(([left], [right]) => left.localeCompare(right)));
const output = new URL("../src/data/lckChampionNamesKo.json", import.meta.url);
await writeFile(output, `${JSON.stringify({ version: korean.version, locale: "ko_KR", names }, null, 2)}\n`);
console.log(`Wrote ${Object.keys(names).length} Korean champion names.`);
