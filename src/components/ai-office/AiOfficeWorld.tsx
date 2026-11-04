"use client";

import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BriefcaseBusiness, Gamepad2, House, MapPin, Sparkles } from "lucide-react";
import styles from "./AiOfficeWorld.module.css";

type Position = { x: number; y: number };
type Activity = "이동 중" | "휴식 중" | "게임 중" | "업무 중" | "회의 중";

const HOME_POSITION = { x: 24, y: 69 };
const OFFICE_POSITION = { x: 76, y: 69 };

function getLocation({ x, y }: Position) {
  if (x < 42) return y < 40 ? "HOME · LIVING ROOM" : "HOME · GAME ROOM";
  if (x > 62) return y < 40 ? "AI OFFICE · LOUNGE" : "AI OFFICE · WORKSPACE";
  return "SUNSET STREET";
}

export function AiOfficeWorld() {
  const [position, setPosition] = useState<Position>(HOME_POSITION);
  const [activity, setActivity] = useState<Activity>("휴식 중");
  const [facing, setFacing] = useState<"left" | "right">("right");
  const keys = useRef(new Set<string>());
  const frame = useRef<number | null>(null);
  const lastTime = useRef(0);

  const move = useCallback((dx: number, dy: number) => {
    if (dx) setFacing(dx < 0 ? "left" : "right");
    setActivity("이동 중");
    setPosition((current) => ({
      x: Math.max(3, Math.min(97, current.x + dx)),
      y: Math.max(17, Math.min(86, current.y + dy)),
    }));
  }, []);

  useEffect(() => {
    const movementKeys = new Set(["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d"]);
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (!movementKeys.has(key)) return;
      event.preventDefault();
      keys.current.add(key);
    };
    const onKeyUp = (event: KeyboardEvent) => keys.current.delete(event.key.toLowerCase());
    const tick = (time: number) => {
      const elapsed = Math.min(32, time - lastTime.current || 16);
      lastTime.current = time;
      const speed = elapsed * 0.018;
      const active = keys.current;
      const dx = (active.has("arrowright") || active.has("d") ? speed : 0) - (active.has("arrowleft") || active.has("a") ? speed : 0);
      const dy = (active.has("arrowdown") || active.has("s") ? speed : 0) - (active.has("arrowup") || active.has("w") ? speed : 0);
      if (dx || dy) move(dx, dy);
      frame.current = requestAnimationFrame(tick);
    };
    window.addEventListener("keydown", onKeyDown, { passive: false });
    window.addEventListener("keyup", onKeyUp);
    frame.current = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, [move]);

  const location = useMemo(() => getLocation(position), [position]);
  const atHomeComputer = position.x < 39 && position.y > 42;
  const atOfficeDesk = position.x > 64 && position.y > 42;

  function handleWorldClick(event: ReactPointerEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest("button")) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const target = {
      x: ((event.clientX - bounds.left) / bounds.width) * 100,
      y: ((event.clientY - bounds.top) / bounds.height) * 100,
    };
    setFacing(target.x < position.x ? "left" : "right");
    setPosition({ x: Math.max(3, Math.min(97, target.x)), y: Math.max(17, Math.min(86, target.y)) });
    setActivity("이동 중");
  }

  function interact() {
    if (atHomeComputer) setActivity((value) => value === "게임 중" ? "휴식 중" : "게임 중");
    else if (atOfficeDesk) setActivity((value) => value === "업무 중" ? "회의 중" : "업무 중");
  }

  function teleport(target: "home" | "office") {
    setPosition(target === "home" ? HOME_POSITION : OFFICE_POSITION);
    setFacing(target === "home" ? "right" : "left");
    setActivity(target === "home" ? "휴식 중" : "업무 중");
  }

  return (
    <div className={styles.shell}>
      <header className={styles.hero}>
        <div>
          <p className={styles.eyebrow}><Sparkles size={15} /> INTERACTIVE PIXEL WORLD</p>
          <h1>AI Office</h1>
          <p>집의 게임룸에서 쉬다가 길을 건너 AI 회사로 출근해 보세요.</p>
        </div>
        <div className={styles.liveBadge}><i /> WORLD ONLINE</div>
      </header>

      <section className={styles.dashboard} aria-label="AI Office 상태">
        <div className={styles.profile}>
          <span className={styles.miniAvatar}>S</span>
          <div><strong>SYUN</strong><small>{activity}</small></div>
        </div>
        <div className={styles.location}><MapPin size={16} /><div><small>CURRENT LOCATION</small><strong>{location}</strong></div></div>
        <div className={styles.quickTravel}>
          <button type="button" onClick={() => teleport("home")}><House size={15} /> 집으로</button>
          <button type="button" onClick={() => teleport("office")}><BriefcaseBusiness size={15} /> 회사로</button>
        </div>
      </section>

      <div className={styles.worldFrame}>
        <div className={styles.world} onPointerDown={handleWorldClick} role="application" aria-label="집과 회사를 이동하는 AI Office 월드">
          <div className={styles.grass} />
          <div className={styles.road}><span className={styles.roadLine} /><span className={styles.crosswalk} /></div>
          <div className={`${styles.tree} ${styles.treeOne}`} /><div className={`${styles.tree} ${styles.treeTwo}`} /><div className={`${styles.tree} ${styles.treeThree}`} />

          <section className={`${styles.building} ${styles.home}`} aria-label="집">
            <div className={styles.buildingLabel}><House size={14} /> SYUN&apos;S HOME</div>
            <div className={`${styles.room} ${styles.livingRoom}`}>
              <div className={styles.window}><i /><i /><i /><i /></div>
              <div className={styles.sofa}><span /><span /></div>
              <div className={styles.rug} />
              <div className={styles.plant}>♣</div>
              <span className={styles.roomName}>LIVING</span>
            </div>
            <div className={`${styles.room} ${styles.gameRoom}`}>
              <div className={styles.desk}>
                <span className={styles.monitor}><i>AI</i></span><span className={styles.monitor}><i>GAME</i></span>
                <span className={styles.keyboard} />
              </div>
              <div className={styles.chair}>▼</div>
              <div className={styles.console}>● ●</div>
              <div className={styles.shelf}><i /><i /><i /></div>
              <span className={styles.roomName}>GAME ROOM</span>
            </div>
          </section>

          <div className={styles.busStop}><span>AI</span><small>BUS</small></div>
          <div className={styles.signpost}><span>HOME</span><span>OFFICE</span></div>

          <section className={`${styles.building} ${styles.office}`} aria-label="AI 회사">
            <div className={styles.buildingLabel}><BriefcaseBusiness size={14} /> PIXEL AI LAB</div>
            <div className={`${styles.room} ${styles.officeLounge}`}>
              <div className={styles.coffeeBar}><span>☕</span><i /><i /></div>
              <div className={styles.officeSofa}><span /><span /></div>
              <div className={styles.vending}>AI<br />SNACK</div>
              <span className={styles.roomName}>LOUNGE</span>
            </div>
            <div className={`${styles.room} ${styles.workRoom}`}>
              <div className={`${styles.workDesk} ${styles.workDeskOne}`}><span>⌁</span><i /></div>
              <div className={`${styles.workDesk} ${styles.workDeskTwo}`}><span>AI</span><i /></div>
              <div className={`${styles.workDesk} ${styles.workDeskThree}`}><span>✓</span><i /></div>
              <div className={`${styles.bot} ${styles.botOne}`}>◉</div>
              <div className={`${styles.bot} ${styles.botTwo}`}>◉</div>
              <div className={styles.board}>SPRINT<br /><i>▰ ▰ ▱</i></div>
              <span className={styles.roomName}>WORKSPACE</span>
            </div>
          </section>

          <div className={`${styles.avatar} ${facing === "left" ? styles.faceLeft : ""} ${activity === "이동 중" ? styles.walking : ""}`} style={{ "--x": `${position.x}%`, "--y": `${position.y}%` } as CSSProperties} aria-label={`플레이어, ${activity}`}>
            <span className={styles.avatarShadow} />
            <span className={styles.avatarHair} />
            <span className={styles.avatarHead}><i /></span>
            <span className={styles.avatarBody}>S</span>
            <span className={styles.avatarLegs}><i /><i /></span>
            <b>{activity}</b>
          </div>
        </div>
      </div>

      <section className={styles.controls}>
        <div><strong>이동 방법</strong><p>방향키 · WASD · 월드 클릭으로 이동</p></div>
        <div className={styles.dpad} aria-label="모바일 이동 버튼">
          <button type="button" onPointerDown={() => move(0, -3)} aria-label="위로 이동">▲</button>
          <button type="button" onPointerDown={() => move(-3, 0)} aria-label="왼쪽으로 이동">◀</button>
          <button type="button" onPointerDown={() => move(0, 3)} aria-label="아래로 이동">▼</button>
          <button type="button" onPointerDown={() => move(3, 0)} aria-label="오른쪽으로 이동">▶</button>
        </div>
        <button type="button" className={styles.actionButton} onClick={interact} disabled={!atHomeComputer && !atOfficeDesk}>
          <Gamepad2 size={17} /> {atHomeComputer ? "게임룸 이용" : atOfficeDesk ? "업무 시작" : "방 안으로 이동하세요"}
        </button>
      </section>
    </div>
  );
}
