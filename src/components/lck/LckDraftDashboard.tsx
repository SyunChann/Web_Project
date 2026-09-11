"use client";

import Image from "next/image";
import { useMemo, useState, type ReactNode } from "react";
import { BarChart3, GitCompareArrows, ShieldBan, Swords, Trophy } from "lucide-react";
import data from "@/data/lckDraftGames.json";
import localizedChampions from "@/data/lckChampionNamesKo.json";

type Side = { team: string; won: boolean; bans: string[]; picks: string[] };
type Game = { id: string; date: string; patch: string; split: string; stage: "regular" | "playoffs"; seriesId: string; gameNumber: number; blue: Side; red: Side };
type Count = { name: string; picks: number; bans: number; wins: number };
const games = data.games as Game[];
const rate = (value: number, total: number) => total ? `${(value * 100 / total).toFixed(1)}%` : "-";

export function LckDraftDashboard() {
  const patches = useMemo(() => [...new Set(games.map((game) => game.patch))].sort((a, b) => b.localeCompare(a, undefined, { numeric: true })), []);
  const teams = useMemo(() => [...new Set(games.flatMap((game) => [game.blue.team, game.red.team]))].sort(), []);
  const [patch, setPatch] = useState("all");
  const [stage, setStage] = useState("all");
  const [team, setTeam] = useState("all");
  const [minimumPicks, setMinimumPicks] = useState(3);
  const [selectedChampion, setSelectedChampion] = useState<string | null>(null);
  const [heatMetric, setHeatMetric] = useState<"picks" | "bans">("picks");
  const baseGames = useMemo(() => games.filter((game) => (stage === "all" || game.stage === stage) && (team === "all" || game.blue.team === team || game.red.team === team)), [stage, team]);
  const filteredGames = useMemo(() => baseGames.filter((game) => patch === "all" || game.patch === patch), [baseGames, patch]);
  const stats = useMemo(() => compute(filteredGames), [filteredGames]);
  const visibleChampions = stats.champions.filter((row) => row.picks >= minimumPicks);
  const previousPatch = patch === "all" ? null : patches[patches.indexOf(patch) + 1] ?? null;
  const previousStats = useMemo(() => previousPatch ? compute(baseGames.filter((game) => game.patch === previousPatch)) : null, [baseGames, previousPatch]);
  const detail = useMemo(() => selectedChampion ? championDetail(filteredGames, selectedChampion) : null, [filteredGames, selectedChampion]);
  const series = useMemo(() => fearlessSeries(filteredGames), [filteredGames]);

  return <section className="space-y-6">
    <div className="grid gap-3 rounded-2xl border border-[#dce4f0] bg-white p-4 shadow-sm sm:grid-cols-2 xl:grid-cols-4">
      <Select label="패치" value={patch} onChange={setPatch} options={["all", ...patches]} labelOf={(value) => value === "all" ? "전체 패치" : value} />
      <Select label="대회 구간" value={stage} onChange={setStage} options={["all", "regular", "playoffs"]} labelOf={(value) => ({ all: "정규시즌 + 플레이오프", regular: "정규시즌", playoffs: "플레이오프" })[value] ?? value} />
      <Select label="팀" value={team} onChange={setTeam} options={["all", ...teams]} labelOf={(value) => value === "all" ? "전체 팀" : value} />
      <Select label="최소 픽 표본" value={String(minimumPicks)} onChange={(value) => setMinimumPicks(Number(value))} options={["1", "3", "5", "10"]} labelOf={(value) => `${value}픽 이상`} />
    </div>

    <div className="grid gap-3 sm:grid-cols-4">
      <Metric icon={<Swords size={17} />} label="집계 경기" value={`${stats.gameCount}게임`} />
      <Metric icon={<BarChart3 size={17} />} label="표본 충족 챔피언" value={`${visibleChampions.length}명`} />
      <Metric icon={<ShieldBan size={17} />} label="최다 존재감" value={stats.champions[0] ? koreanName(stats.champions[0].name) : "-"} />
      <Metric icon={<Trophy size={17} />} label="최다 승리 팀" value={stats.teams[0]?.name ?? "-"} />
    </div>

    {patch !== "all" ? <PatchComparison currentPatch={patch} current={stats} previousPatch={previousPatch} previous={previousStats} /> : <Notice icon={<GitCompareArrows size={18} />} text="패치를 하나 선택하면 직전 패치 대비 밴픽 존재감 변화를 볼 수 있습니다." />}

    <div className="grid gap-6 xl:grid-cols-2">
      <TablePanel title="챔피언 밴픽 순위" description={`존재감 = (픽 + 밴) ÷ 경기 수. 현재 ${minimumPicks}픽 이상만 표시합니다.`}>
        <table><thead><tr><th>챔피언</th><th>픽</th><th>밴</th><th>존재감</th><th>픽 승률</th></tr></thead><tbody>{visibleChampions.slice(0, 30).map((row) => <tr key={row.name}><td><button type="button" onClick={() => setSelectedChampion(row.name)} className="rounded-lg text-left transition hover:bg-[#eef4ff] focus:outline-none focus:ring-2 focus:ring-[#5b7fc7]"><ChampionLabel name={row.name} /></button></td><td>{row.picks}</td><td>{row.bans}</td><td><RateBadge value={rate(row.picks + row.bans, stats.gameCount)} tone="presence" /></td><td><RateBadge value={rate(row.wins, row.picks)} tone="win" /></td></tr>)}</tbody></table>
      </TablePanel>
      <TablePanel title="팀별 드래프트 성과" description="선호 픽과 견제 밴은 해당 팀에서 가장 많이 나온 챔피언입니다.">
        <table><thead><tr><th>팀</th><th>게임</th><th>승률</th><th>선호 픽</th><th>견제 밴</th></tr></thead><tbody>{stats.teams.map((row) => <tr key={row.name}><td className="whitespace-nowrap">{row.name}</td><td>{row.games}</td><td><RateBadge value={rate(row.wins, row.games)} tone="win" /></td><td>{row.topPick ? <ChampionLabel name={row.topPick} compact /> : "-"}</td><td>{row.topBan ? <ChampionLabel name={row.topBan} compact /> : "-"}</td></tr>)}</tbody></table>
      </TablePanel>
    </div>

    {detail && selectedChampion ? <ChampionDetail name={selectedChampion} detail={detail} onClose={() => setSelectedChampion(null)} /> : null}

    <TablePanel title="함께 선택된 조합" description="같은 팀이 한 게임에서 고른 2챔피언 조합입니다. 2경기 이상만 표시합니다.">
      <table><thead><tr><th>조합</th><th>선택</th><th>승</th><th>승률</th></tr></thead><tbody>{stats.pairs.slice(0, 20).map((row) => <tr key={row.name}><td><ChampionPair name={row.name} /></td><td>{row.picks}</td><td>{row.wins}</td><td><RateBadge value={rate(row.wins, row.picks)} tone="win" /></td></tr>)}</tbody></table>
    </TablePanel>

    <Heatmap stats={stats} metric={heatMetric} setMetric={setHeatMetric} />
    <FearlessPanel series={series} />
    <p className="text-xs leading-5 text-[#718096]">데이터: <a href={data.sourceUrl} target="_blank" rel="noreferrer" className="underline">{data.source}</a> · 갱신: {new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium" }).format(new Date(data.updatedAt))}</p>
  </section>;
}

function compute(list: Game[]) {
  const champions = new Map<string, Count>();
  const teams = new Map<string, { name: string; games: number; wins: number; picks: Map<string, number>; bans: Map<string, number> }>();
  const pairs = new Map<string, { name: string; picks: number; wins: number }>();
  const add = (map: Map<string, number>, name: string) => map.set(name, (map.get(name) ?? 0) + 1);
  for (const game of list) for (const side of [game.blue, game.red]) {
    const team = teams.get(side.team) ?? { name: side.team, games: 0, wins: 0, picks: new Map(), bans: new Map() };
    team.games++; if (side.won) team.wins++; teams.set(side.team, team);
    for (const name of side.bans) { const row = champions.get(name) ?? { name, picks: 0, bans: 0, wins: 0 }; row.bans++; champions.set(name, row); add(team.bans, name); }
    for (const name of side.picks) { const row = champions.get(name) ?? { name, picks: 0, bans: 0, wins: 0 }; row.picks++; if (side.won) row.wins++; champions.set(name, row); add(team.picks, name); }
    for (let i = 0; i < side.picks.length; i++) for (let j = i + 1; j < side.picks.length; j++) { const name = [side.picks[i], side.picks[j]].sort().join(" + "); const row = pairs.get(name) ?? { name, picks: 0, wins: 0 }; row.picks++; if (side.won) row.wins++; pairs.set(name, row); }
  }
  const best = (map: Map<string, number>) => [...map].sort((a, b) => b[1] - a[1])[0]?.[0];
  return { gameCount: list.length, champions: [...champions.values()].sort((a, b) => b.picks + b.bans - a.picks - a.bans || b.picks - a.picks), teams: [...teams.values()].map((row) => ({ ...row, topPick: best(row.picks), topBan: best(row.bans) })).sort((a, b) => b.wins - a.wins || b.games - a.games), pairs: [...pairs.values()].filter((row) => row.picks >= 2).sort((a, b) => b.picks - a.picks || b.wins - a.wins) };
}

function championDetail(list: Game[], champion: string) {
  const patches = new Map<string, Count>(); const teams = new Map<string, Count>(); const partners = new Map<string, { name: string; picks: number; wins: number }>();
  let bluePicks = 0; let blueWins = 0; let redPicks = 0; let redWins = 0; let bans = 0;
  for (const game of list) for (const [sideName, side] of [["blue", game.blue], ["red", game.red]] as const) {
    const patchRow = patches.get(game.patch) ?? { name: game.patch, picks: 0, bans: 0, wins: 0 };
    const teamRow = teams.get(side.team) ?? { name: side.team, picks: 0, bans: 0, wins: 0 };
    if (side.bans.includes(champion)) { patchRow.bans++; teamRow.bans++; bans++; }
    if (side.picks.includes(champion)) { patchRow.picks++; teamRow.picks++; if (side.won) { patchRow.wins++; teamRow.wins++; } if (sideName === "blue") { bluePicks++; if (side.won) blueWins++; } else { redPicks++; if (side.won) redWins++; } for (const partner of side.picks.filter((name) => name !== champion)) { const row = partners.get(partner) ?? { name: partner, picks: 0, wins: 0 }; row.picks++; if (side.won) row.wins++; partners.set(partner, row); } }
    patches.set(game.patch, patchRow); teams.set(side.team, teamRow);
  }
  return { bans, bluePicks, blueWins, redPicks, redWins, patches: [...patches.values()].filter((row) => row.picks + row.bans > 0).sort((a, b) => b.name.localeCompare(a.name, undefined, { numeric: true })), teams: [...teams.values()].filter((row) => row.picks + row.bans > 0).sort((a, b) => b.picks + b.bans - a.picks - a.bans), partners: [...partners.values()].sort((a, b) => b.picks - a.picks).slice(0, 8) };
}

function fearlessSeries(list: Game[]) {
  const grouped = new Map<string, Game[]>(); for (const game of list) (grouped.get(game.seriesId) ?? grouped.set(game.seriesId, []).get(game.seriesId))!.push(game);
  return [...grouped.values()].filter((rows) => rows.length >= 2).map((rows) => { const sorted = rows.sort((a, b) => a.gameNumber - b.gameNumber); const teamNames = [sorted[0].blue.team, sorted[0].red.team]; const summaries = teamNames.map((name) => { const picks = sorted.flatMap((game) => game.blue.team === name ? game.blue.picks : game.red.picks); return { name, unique: new Set(picks).size, total: picks.length, repeats: picks.length - new Set(picks).size }; }); return { id: sorted[0].seriesId, date: sorted[0].date, patch: sorted[0].patch, games: sorted, teams: summaries }; }).sort((a, b) => b.date.localeCompare(a.date));
}

function PatchComparison({ currentPatch, current, previousPatch, previous }: { currentPatch: string; current: ReturnType<typeof compute>; previousPatch: string | null; previous: ReturnType<typeof compute> | null }) {
  if (!previousPatch || !previous) return <Notice icon={<GitCompareArrows size={18} />} text={`${currentPatch} 이전 비교 패치 데이터가 없습니다.`} />;
  const before = new Map(previous.champions.map((row) => [row.name, (row.picks + row.bans) / Math.max(previous.gameCount, 1)]));
  const changes = current.champions.map((row) => ({ name: row.name, current: (row.picks + row.bans) / Math.max(current.gameCount, 1), delta: (row.picks + row.bans) / Math.max(current.gameCount, 1) - (before.get(row.name) ?? 0) })).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, 8);
  return <TablePanel title={`${currentPatch} vs ${previousPatch} 메타 변화`} description="경기당 밴픽 존재감 변화가 큰 챔피언 순입니다."><div className="grid gap-2 p-4 sm:grid-cols-2 lg:grid-cols-4">{changes.map((row) => <div key={row.name} className="flex items-center justify-between rounded-xl border border-[#e3e9f2] p-3"><ChampionLabel name={row.name} compact /><span className={`ml-3 text-sm font-black ${row.delta >= 0 ? "text-[#087443]" : "text-[#c43c46]"}`}>{row.delta >= 0 ? "▲" : "▼"} {Math.abs(row.delta * 100).toFixed(1)}%p</span></div>)}</div></TablePanel>;
}

function ChampionDetail({ name, detail, onClose }: { name: string; detail: ReturnType<typeof championDetail>; onClose: () => void }) {
  return <article className="rounded-2xl border-2 border-[#a9bce1] bg-gradient-to-br from-white to-[#f5f8ff] p-5 shadow-md"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-black tracking-wider text-[#526fa8]">CHAMPION DETAIL</p><div className="mt-2"><ChampionLabel name={name} /></div></div><button type="button" onClick={onClose} className="rounded-lg border border-[#ccd6e6] bg-white px-3 py-1.5 text-xs font-black text-[#52616b]">닫기</button></div><div className="mt-5 grid gap-3 sm:grid-cols-3"><Metric icon={<Swords size={16} />} label="블루 픽 승률" value={`${rate(detail.blueWins, detail.bluePicks)} · ${detail.bluePicks}픽`} /><Metric icon={<Swords size={16} />} label="레드 픽 승률" value={`${rate(detail.redWins, detail.redPicks)} · ${detail.redPicks}픽`} /><Metric icon={<ShieldBan size={16} />} label="총 밴" value={`${detail.bans}회`} /></div><div className="mt-5 grid gap-5 lg:grid-cols-3"><MiniList title="패치별 기록" rows={detail.patches.slice(0, 8).map((row) => [`${row.name} · ${row.picks}픽 ${row.bans}밴`, rate(row.wins, row.picks)])} /><MiniList title="많이 사용한 팀" rows={detail.teams.slice(0, 8).map((row) => [`${row.name} · ${row.picks}픽`, rate(row.wins, row.picks)])} /><MiniList title="자주 함께 나온 챔피언" rows={detail.partners.map((row) => [koreanName(row.name), `${row.picks}회 · ${rate(row.wins, row.picks)}`])} /></div></article>;
}

function Heatmap({ stats, metric, setMetric }: { stats: ReturnType<typeof compute>; metric: "picks" | "bans"; setMetric: (value: "picks" | "bans") => void }) {
  const champions = stats.champions.slice(0, 12); const maximum = Math.max(1, ...stats.teams.flatMap((team) => champions.map((champion) => team[metric].get(champion.name) ?? 0)));
  return <TablePanel title="팀 × 챔피언 히트맵" description="색이 진할수록 해당 팀의 선택 또는 밴 횟수가 많습니다."><div className="flex gap-2 border-b border-[#e7edf5] p-4"><Toggle active={metric === "picks"} onClick={() => setMetric("picks")}>픽</Toggle><Toggle active={metric === "bans"} onClick={() => setMetric("bans")}>밴</Toggle></div><table><thead><tr><th className="sticky left-0 z-10">팀</th>{champions.map((champion) => <th key={champion.name} title={koreanName(champion.name)}><Image src={championImage(champion.name)} alt={koreanName(champion.name)} width={28} height={28} className="h-7 w-7 rounded-md" /></th>)}</tr></thead><tbody>{stats.teams.map((team) => <tr key={team.name}><td className="sticky left-0 z-10 whitespace-nowrap bg-white">{team.name}</td>{champions.map((champion) => { const value = team[metric].get(champion.name) ?? 0; const strength = value / maximum; return <td key={champion.name} className="text-center" title={`${team.name} · ${koreanName(champion.name)} ${value}회`}><span className="inline-flex h-8 w-9 items-center justify-center rounded-md text-xs font-black" style={{ backgroundColor: `rgba(67, 56, 202, ${0.08 + strength * 0.72})`, color: strength > 0.55 ? "white" : "#334155" }}>{value}</span></td>; })}</tr>)}</tbody></table></TablePanel>;
}

function FearlessPanel({ series }: { series: ReturnType<typeof fearlessSeries> }) {
  return <TablePanel title="다전제 챔피언 풀 · Fearless" description="‘20종 / 20픽’은 4세트 동안 팀이 총 20번 픽했고, 그 20개가 모두 서로 다른 챔피언이라는 뜻입니다."><div className="border-b border-[#e7edf5] bg-[#f8faff] px-5 py-3 text-xs font-bold leading-5 text-[#52616b]">팀당 총 픽 수는 세트 수 × 5입니다. 고유 챔피언 수가 총 픽 수와 같고 중복이 없으면, 이전 세트에서 사용한 챔피언을 다시 선택하지 않은 것입니다.</div><table><thead><tr><th>날짜·패치</th><th>매치업</th><th>진행</th><th>팀별 챔피언 풀</th><th>중복 픽</th></tr></thead><tbody>{series.slice(0, 20).map((row) => <tr key={row.id}><td className="whitespace-nowrap">{row.date}<br /><span className="text-xs text-[#7b8798]">패치 {row.patch}</span></td><td>{row.teams.map((team) => team.name).join(" vs ")}</td><td className="whitespace-nowrap"><strong>{row.games.length}세트</strong><br /><span className="text-xs text-[#7b8798]">팀당 {row.games.length * 5}픽</span></td><td>{row.teams.map((team) => <div key={team.name} className="whitespace-nowrap"><span className="text-[#52616b]">{team.name}</span>: <strong className="text-[#253b67]">{team.unique}종 / {team.total}픽</strong></div>)}</td><td>{row.teams.map((team) => <div key={team.name} className={`whitespace-nowrap ${team.repeats ? "text-[#c43c46]" : "text-[#087443]"}`}><span>{team.name}</span>: <strong>{team.repeats ? `${team.repeats}회` : "없음"}</strong></div>)}</td></tr>)}</tbody></table>{series.length === 0 ? <p className="p-5 text-sm font-bold text-[#718096]">선택한 조건에 2세트 이상 진행된 시리즈가 없습니다.</p> : null}</TablePanel>;
}

function Select({ label, value, onChange, options, labelOf }: { label: string; value: string; onChange: (value: string) => void; options: string[]; labelOf: (value: string) => string }) { return <label className="grid gap-1 text-sm font-black text-[#334155]"><span>{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className="rounded-lg border border-[#cbd6e6] bg-white px-3 py-2.5 font-bold text-[#13233d]">{options.map((option) => <option key={option} value={option}>{labelOf(option)}</option>)}</select></label>; }
function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) { return <article className="rounded-xl border border-[#dce4f0] bg-white p-4 shadow-sm"><p className="flex items-center gap-2 text-xs font-black text-[#64748b]">{icon}{label}</p><p className="mt-2 truncate text-xl font-black text-[#13233d]">{value}</p></article>; }
function TablePanel({ title, description, children }: { title: string; description: string; children: ReactNode }) { return <article className="overflow-x-auto rounded-2xl border border-[#dce4f0] bg-white shadow-sm"><header className="border-b border-[#e7edf5] px-5 py-4"><h2 className="font-black text-[#13233d]">{title}</h2><p className="mt-1 text-xs leading-5 text-[#64748b]">{description}</p></header><div className="min-w-130 [&_table]:w-full [&_td]:border-b [&_td]:border-[#edf1f6] [&_td]:px-4 [&_td]:py-3 [&_td]:text-sm [&_td]:font-bold [&_td]:text-[#334155] [&_th]:border-b [&_th]:border-[#dce4f0] [&_th]:bg-[#f8faff] [&_th]:px-4 [&_th]:py-3 [&_th]:text-left [&_th]:text-xs [&_th]:font-black [&_th]:text-[#64748b]">{children}</div></article>; }
function Notice({ icon, text }: { icon: ReactNode; text: string }) { return <div className="flex items-center gap-2 rounded-xl border border-[#cdd9ee] bg-[#f5f8ff] px-4 py-3 text-sm font-bold text-[#445c89]">{icon}{text}</div>; }
function Toggle({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) { return <button type="button" onClick={onClick} className={`rounded-lg px-3 py-1.5 text-xs font-black ${active ? "bg-[#4338ca] text-white" : "border border-[#d6deea] bg-white text-[#52616b]"}`}>{children}</button>; }
function MiniList({ title, rows }: { title: string; rows: [string, string][] }) { return <div><h3 className="mb-2 text-sm font-black text-[#334155]">{title}</h3><div className="space-y-1.5">{rows.map(([label, value]) => <div key={label} className="flex justify-between gap-3 rounded-lg bg-white px-3 py-2 text-xs font-bold shadow-sm"><span>{label}</span><span className="text-[#526fa8]">{value}</span></div>)}</div></div>; }

const championAssetIds: Record<string, string> = { "Aurelion Sol": "AurelionSol", "Bel'Veth": "Belveth", "Cho'Gath": "Chogath", "Dr. Mundo": "DrMundo", "Jarvan IV": "JarvanIV", "Kai'Sa": "Kaisa", "Kha'Zix": "Khazix", "Kog'Maw": "KogMaw", "LeBlanc": "Leblanc", "Lee Sin": "LeeSin", "Master Yi": "MasterYi", "Miss Fortune": "MissFortune", "Nunu & Willump": "Nunu", "Rek'Sai": "RekSai", "Renata Glasc": "Renata", "Tahm Kench": "TahmKench", "Twisted Fate": "TwistedFate", "Vel'Koz": "Velkoz", "Wukong": "MonkeyKing", "Xin Zhao": "XinZhao" };
function championImage(name: string) { const id = championAssetIds[name] ?? name.replace(/[^a-zA-Z0-9]/g, ""); return `https://ddragon.leagueoflegends.com/cdn/16.17.1/img/champion/${id}.png`; }
const koreanChampionNames = localizedChampions.names as Record<string, string>;
function koreanName(name: string) { return koreanChampionNames[name] ?? name; }
function ChampionLabel({ name, compact = false }: { name: string; compact?: boolean }) { const size = compact ? 28 : 36; return <span className="inline-flex min-w-max items-center gap-2 px-1 py-0.5" title={compact ? name : undefined}><Image src={championImage(name)} alt="" width={size} height={size} className={`${compact ? "h-7 w-7" : "h-9 w-9"} rounded-lg border border-[#d6deea] bg-[#eef2f7] object-cover shadow-sm`} onError={(event) => { event.currentTarget.style.display = "none"; }} />{compact ? <span className="text-xs font-black text-[#172033]">{koreanName(name)}</span> : <span className="grid leading-tight"><span className="font-black text-[#172033]">{koreanName(name)}</span><span className="mt-0.5 text-[10px] font-bold text-[#8793a5]">{name}</span></span>}</span>; }
function ChampionPair({ name }: { name: string }) { return <span className="inline-flex min-w-max items-center gap-2">{name.split(" + ").map((champion, index) => <span key={champion} className="inline-flex items-center gap-1.5">{index ? <span className="mr-0.5 text-[#94a3b8]">+</span> : null}<ChampionLabel name={champion} compact /></span>)}</span>; }
function RateBadge({ value, tone }: { value: string; tone: "presence" | "win" }) { const numeric = Number.parseFloat(value); const strong = Number.isFinite(numeric) && numeric >= 60; const style = tone === "presence" ? "bg-[#eef2ff] text-[#4338ca]" : strong ? "bg-[#ecfdf3] text-[#087443]" : "bg-[#f1f5f9] text-[#475569]"; return <span className={`inline-flex min-w-14 justify-center rounded-full px-2 py-1 text-xs font-black ${style}`}>{value}</span>; }
