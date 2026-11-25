import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const dynamic = "force-static";

export async function GET() {
  const font = await readFile(join(process.cwd(), "src/assets/fonts/My_Font.woff"));
  return new ImageResponse(
    <div style={{width:"100%",height:"100%",display:"flex",flexDirection:"column",padding:"58px 70px",background:"#19242f",color:"#e7edf4",fontFamily:"Archive"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <svg width="54" height="54" viewBox="0 0 24 24" fill="none" stroke="#c5dccb" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true"><path d="M4 4v16M8 4v16M12 4v16m4-15 4 14"/></svg>
        <div style={{display:"flex",fontSize:27,color:"#b0bdb4",letterSpacing:2}}>SYUN ARCHIVE</div>
      </div>
      <div style={{display:"flex",flex:1,flexDirection:"column",justifyContent:"center",paddingBottom:12}}>
        <div style={{display:"flex",fontSize:124,lineHeight:1.25,letterSpacing:-5}}>취향 보관소</div>
        <div style={{display:"flex",fontSize:48,lineHeight:1.5,marginTop:22,color:"#b0bdb4"}}>좋아한 것들의 기록.</div>
      </div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",paddingTop:26,borderTop:"2px solid #33414a"}}>
        <div style={{display:"flex",fontSize:32,color:"#c5dccb"}}>콘텐츠 · 맛집 · 여행 · 술</div>
        <div style={{display:"flex",fontSize:25,color:"#b0bdb4"}}>syun-archive.vercel.app</div>
      </div>
    </div>,
    {width:1200,height:630,fonts:[{name:"Archive",data:font,style:"normal",weight:400}]},
  );
}
