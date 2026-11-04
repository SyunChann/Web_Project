import { ExternalLink, Gamepad2, Route, Sparkles, Users } from "lucide-react";
import styles from "./AiOfficeWorld.module.css";

export function AiOfficeWorld() {
  return (
    <div className={styles.shell}>
      <header className={styles.hero}>
        <div>
          <p className={styles.eyebrow}><Sparkles size={15} /> PIXEL OFFICE ENGINE</p>
          <h1>AI Office</h1>
          <p>Pixel Office의 실제 캔버스 엔진과 캐릭터 시스템을 로그인 전용 공간으로 연결했습니다.</p>
        </div>
        <div className={styles.engineBadge}><i /> ENGINE ONLINE</div>
      </header>

      <section className={styles.officeFrame}>
        <div className={styles.frameBar}>
          <div><i /><i /><i /></div>
          <strong>PIXEL OFFICE · LIVE SESSION</strong>
          <span>640 × 800</span>
        </div>
        <div className={styles.iframeViewport}>
          <iframe
            className={styles.officeIframe}
            src="/pixel-office/index.html"
            title="Pixel Office"
            allow="microphone"
          />
        </div>
      </section>

      <section className={styles.featureBar}>
        <div><Route size={18} /><span><strong>A* 자동 경로 탐색</strong><small>장소 버튼을 누르면 충돌 지도를 따라 이동합니다.</small></span></div>
        <div><Users size={18} /><span><strong>4명의 라이브 캐릭터</strong><small>각 캐릭터가 걷고, 일하고, 대화합니다.</small></span></div>
        <div><Gamepad2 size={18} /><span><strong>AI Director</strong><small>빠른 이동과 텍스트 명령을 지원합니다.</small></span></div>
      </section>

      <footer className={styles.credits}>
        <span>Character sprites: MetroCity Free Topdown Character Pack by JIK-A-4.</span>
        <a href="https://github.com/piraminet/pixel-office" target="_blank" rel="noreferrer">Pixel Office 원본 저장소 <ExternalLink size={13} /></a>
      </footer>
    </div>
  );
}
