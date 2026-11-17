import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const dynamic = "force-static";

export async function GET() {
  const font = await readFile(join(process.cwd(), "src/assets/fonts/My_Font.woff"));
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "64px", background: "#faf8f4", color: "#142233", fontFamily: "Archive" }}>
      <div style={{ display: "flex", flexDirection: "column", width: 690 }}>
        <div style={{ display: "flex", width: 84, height: 84, alignItems: "center", justifyContent: "center", borderRadius: 18, background: "#be4b49", color: "white", marginBottom: 40 }}><svg width="54" height="54" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M4 4v16M8 4v16M12 4v16m4-15 4 14" /></svg></div>
        <div style={{ display: "flex", fontSize: 120, lineHeight: 1.2 }}>취향 보관소</div>
        <div style={{ display: "flex", fontSize: 38, marginTop: 24 }}>좋아하는 것을 기록하는 공간</div>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", width: 330, gap: 18 }}>
        {[
          { color: "#be4b49", icon: <svg width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="#be4b49" strokeWidth="2" strokeLinejoin="round"><path d="m3 8 17-5 1 5L4 13 3 8Zm1 5h17v8H4v-8Zm3-6 3 4m3-6 3 4" /></svg> },
          { color: "#247e78", icon: <svg width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="#247e78" strokeWidth="2" strokeLinecap="round"><path d="M4 3v5c0 4 6 4 6 0V3M7 3v18M17 12v9" /><ellipse cx="17" cy="7" rx="3" ry="5" fill="#247e78" /></svg> },
          { color: "#0781b2", icon: <svg width="96" height="96" viewBox="0 0 24 24" fill="#0781b2"><path d="m21 3-7 5-9-2-2 2 8 4-5 5-3-1-2 2 4 2 2 3 2-2-1-3 5-5 4 8 2-2-2-9 5-6c2-3 1-3-1-1Z" /></svg> },
          { color: "#304d70", icon: <svg width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="#304d70" strokeWidth="1.6" strokeLinejoin="round"><path d="M2 11h9l-1 10H3L2 11Z" /><path d="m5 15 2-1 2 2-2 2-2-3Z" /><path d="M16 2h5l-1.5 4 2.5 5v10h-8V11l2.5-5L16 2Z" fill="#304d70" /></svg> },
        ].map(({ color, icon }) => <div key={color} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 154, height: 154, borderRadius: 24, border: "2px solid #d7dce1", background: "white", color }}>{icon}</div>)}
      </div>
    </div>,
    { width: 1200, height: 630, fonts: [{ name: "Archive", data: font, style: "normal", weight: 400 }] },
  );
}
