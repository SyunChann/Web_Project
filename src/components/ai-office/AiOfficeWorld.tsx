import { ExternalLink, MapPin, MessageSquareOff, MonitorCog, Sparkles } from "lucide-react";
import styles from "./AiOfficeWorld.module.css";

export function AiOfficeWorld() {
  return (
    <div className={styles.shell}>
      <header className={styles.hero}>
        <div>
          <p className={styles.eyebrow}><Sparkles size={15} /> PIXEL AGENTS · LOCAL MODE</p>
          <h1>AI Office</h1>
          <p>픽셀 에이전트가 일하고 쉬는 오피스임. 장소를 누르면 바로 이동해서 행동을 시작함.</p>
        </div>
        <div className={styles.engineBadge}><i /> OFFICE ONLINE</div>
      </header>

      <section className={styles.officeFrame}>
        <div className={styles.frameBar}>
          <div><i /><i /><i /></div>
          <strong>PIXEL AGENTS · PRIVATE OFFICE</strong>
          <span>CHAT DISABLED</span>
        </div>
        <div className={styles.iframeViewport}>
          <iframe
            className={styles.officeIframe}
            src="/pixel-agents/index.html"
            title="Pixel Agents AI Office"
            sandbox="allow-scripts allow-same-origin"
          />
        </div>
      </section>

      <section className={styles.featureBar}>
        <div><MapPin size={18} /><span><strong>클릭 이동</strong><small>개발, 회의, 자료실, 휴식, 카페를 누르면 자동으로 이동함.</small></span></div>
        <div><MonitorCog size={18} /><span><strong>Pixel Agents 엔진</strong><small>공식 캔버스 렌더러와 캐릭터·가구 에셋을 그대로 사용함.</small></span></div>
        <div><MessageSquareOff size={18} /><span><strong>채팅 없음</strong><small>터미널, 메시지 입력, 서버 연결 기능을 모두 제외함.</small></span></div>
      </section>

      <footer className={styles.credits}>
        <span>Pixel Agents MIT · Character sprites based on MetroCity by JIK-A-4.</span>
        <a href="https://github.com/pixel-agents-hq/pixel-agents" target="_blank" rel="noreferrer">Pixel Agents 원본 저장소 <ExternalLink size={13} /></a>
      </footer>
    </div>
  );
}
