"use client";

import type { CSSProperties, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import {
  Armchair,
  Building2,
  Coffee,
  Gamepad2,
  House,
  Monitor,
  MousePointer2,
  Sparkles,
  Users,
} from "lucide-react";
import styles from "./AiOfficeWorld.module.css";

type Spot = {
  id: string;
  name: string;
  action: string;
  x: number;
  y: number;
  color: string;
  icon: ReactNode;
};

const spots: Spot[] = [
  { id: "rest", name: "휴식 공간", action: "집에서 쉬는 중", x: 19, y: 59, color: "#65a30d", icon: <Armchair size={14} /> },
  { id: "game", name: "게임룸", action: "게임을 즐기는 중", x: 28, y: 35, color: "#2563eb", icon: <Gamepad2 size={14} /> },
  { id: "planning", name: "기획팀", action: "새 기능을 기획하는 중", x: 57, y: 34, color: "#f59e0b", icon: <Sparkles size={14} /> },
  { id: "development", name: "개발팀", action: "코드를 작성하는 중", x: 67, y: 58, color: "#16a34a", icon: <Monitor size={14} /> },
  { id: "meeting", name: "회의실", action: "팀 회의에 참여 중", x: 82, y: 37, color: "#64748b", icon: <Users size={14} /> },
  { id: "cafe", name: "오피스 카페", action: "커피를 마시는 중", x: 84, y: 66, color: "#ea580c", icon: <Coffee size={14} /> },
];

const initialSpot = spots[0];

export function AiOfficeWorld() {
  const [position, setPosition] = useState({ x: initialSpot.x, y: initialSpot.y });
  const [currentSpot, setCurrentSpot] = useState(initialSpot.id);
  const [movingTo, setMovingTo] = useState<string | null>(null);
  const [activity, setActivity] = useState(initialSpot.action);
  const moveTimer = useRef<number | null>(null);

  useEffect(() => () => {
    if (moveTimer.current) window.clearTimeout(moveTimer.current);
  }, []);

  function visit(spot: Spot) {
    if (moveTimer.current) window.clearTimeout(moveTimer.current);
    if (spot.id === currentSpot && !movingTo) {
      setActivity(spot.action);
      return;
    }

    setMovingTo(spot.id);
    setActivity(`${spot.name}(으)로 이동 중`);
    setPosition({ x: spot.x, y: spot.y });
    moveTimer.current = window.setTimeout(() => {
      setCurrentSpot(spot.id);
      setMovingTo(null);
      setActivity(spot.action);
    }, 950);
  }

  const selected = spots.find((spot) => spot.id === (movingTo ?? currentSpot)) ?? initialSpot;

  return (
    <div className={styles.shell}>
      <header className={styles.hero}>
        <div>
          <p className={styles.eyebrow}><Sparkles size={15} /> VISIBLE WORKSPACE</p>
          <h1>AI Office</h1>
          <p>공간을 클릭하면 캐릭터가 이동하고 그곳의 일을 시작합니다.</p>
        </div>
        <div className={styles.liveBadge}><i /> OFFICE ONLINE</div>
      </header>

      <section className={styles.statusBar} aria-label="현재 상태">
        <div className={styles.profile}>
          <span className={styles.miniAvatar}>S</span>
          <div><strong>SYUN</strong><small>{activity}</small></div>
        </div>
        <div className={styles.currentLocation}>
          <span style={{ "--spot-color": selected.color } as CSSProperties}>{selected.icon}</span>
          <div><small>CURRENT PLACE</small><strong>{selected.name}</strong></div>
        </div>
        <p className={styles.clickGuide}><MousePointer2 size={15} /> 라벨을 눌러 이동</p>
      </section>

      <div className={styles.sceneFrame}>
        <div className={styles.scene}>
          <OfficeScene />

          <div
            className={`${styles.avatar} ${movingTo ? styles.avatarMoving : ""}`}
            style={{ "--avatar-x": `${position.x}%`, "--avatar-y": `${position.y}%` } as CSSProperties}
            aria-label={`SYUN, ${activity}`}
          >
            <span className={styles.avatarShadow} />
            <span className={styles.avatarHair} />
            <span className={styles.avatarFace}><i /><i /></span>
            <span className={styles.avatarBody}>S</span>
            <span className={styles.avatarLegs}><i /><i /></span>
          </div>

          {spots.map((spot) => {
            const active = spot.id === currentSpot && !movingTo;
            const destination = spot.id === movingTo;
            return (
              <button
                key={spot.id}
                type="button"
                onClick={() => visit(spot)}
                className={`${styles.spot} ${active ? styles.spotActive : ""} ${destination ? styles.spotMoving : ""}`}
                style={{ "--spot-x": `${spot.x}%`, "--spot-y": `${spot.y}%`, "--spot-color": spot.color } as CSSProperties}
                aria-pressed={active}
              >
                <span>{spot.icon}</span>
                <strong>{spot.name}</strong>
                {active ? <small>● {spot.action}</small> : destination ? <small>이동 중...</small> : null}
              </button>
            );
          })}
        </div>
      </div>

      <section className={styles.helpBar}>
        <MousePointer2 size={18} />
        <div><strong>원하는 장소를 클릭하세요</strong><p>직접 움직일 필요 없이 캐릭터가 이동하고 선택한 행동을 시작합니다.</p></div>
        <div className={styles.placeLegend}><span><House size={14} /> HOME</span><i /><span><Building2 size={14} /> AI COMPANY</span></div>
      </section>
    </div>
  );
}

function OfficeScene() {
  return (
    <svg className={styles.sceneArt} viewBox="0 0 1200 720" role="img" aria-label="집과 AI 회사가 연결된 아이소메트릭 공간">
      <defs>
        <linearGradient id="floor-home" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#f2e7cf" /><stop offset="1" stopColor="#dfca9e" /></linearGradient>
        <linearGradient id="floor-office" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#edf0ef" /><stop offset="1" stopColor="#d9dfde" /></linearGradient>
        <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#dff6f8" stopOpacity=".58" /><stop offset="1" stopColor="#aacdd2" stopOpacity=".22" /></linearGradient>
        <pattern id="wood" width="44" height="44" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><rect width="44" height="44" fill="url(#floor-home)" /><path d="M0 3h44" stroke="#d4bd91" strokeWidth="2" opacity=".45" /></pattern>
        <filter id="shadow"><feDropShadow dx="8" dy="11" stdDeviation="6" floodColor="#18231d" floodOpacity=".22" /></filter>
      </defs>

      <path d="M77 347 489 78l650 257-447 316z" fill="#b8bcb7" opacity=".45" transform="translate(0 18)" />
      <path d="M77 347 489 78l650 257-447 316z" fill="#f7f8f5" stroke="#cfd4cf" strokeWidth="5" filter="url(#shadow)" />
      <path d="M100 348 469 107 644 178 274 432z" fill="url(#wood)" stroke="#d6d2c8" strokeWidth="4" />
      <path d="M274 432 644 178 1114 351 684 623z" fill="url(#floor-office)" stroke="#d6d2c8" strokeWidth="4" />

      <path d="M100 348 469 107 469 53 99 294z" fill="#d5d8d5" />
      <path d="M469 107 644 178 644 122 469 53z" fill="#c6cbc8" />
      <path d="M100 348 274 432 274 402 100 318z" fill="url(#glass)" stroke="#9db6b7" strokeWidth="4" />
      <path d="M274 432 684 623 684 590 274 400z" fill="url(#glass)" stroke="#a3b7b8" strokeWidth="4" />

      <path d="M534 253 644 178 934 285 818 363z" fill="#e8eded" stroke="#c6cecc" strokeWidth="3" />
      <path d="M818 363 934 285 1114 351 990 430z" fill="#e2e7e6" stroke="#c6cecc" strokeWidth="3" />
      <path d="M531 253 818 363 818 319 531 210z" fill="url(#glass)" stroke="#9eb7bb" strokeWidth="4" />
      <path d="M818 363 934 285 934 242 818 319z" fill="url(#glass)" stroke="#9eb7bb" strokeWidth="4" />
      <path d="M934 285 1114 351 1114 308 934 242z" fill="url(#glass)" stroke="#9eb7bb" strokeWidth="4" />

      <path d="M274 432 468 522 602 437 405 350z" fill="#737d7a" stroke="#5b6662" strokeWidth="5" />
      <path d="M299 431 326 444m28 13 27 13m28 13 27 13m28 13 27 13" stroke="#f5e7a4" strokeWidth="7" strokeLinecap="round" />
      <path d="m317 417 18 8m8 4 18 8m-12-34 18 8m8 4 18 8" stroke="#fff" strokeWidth="8" />
      <path d="M283 449 468 535M406 335l203 89" stroke="#dfe4e1" strokeWidth="9" />
      <text x="362" y="516" fill="#eef2ef" fontSize="14" fontWeight="800">WALK STREET</text>

      <g className={styles.homeFurniture}>
        <path d="M124 348 218 288l101 41-97 64z" fill="#88aaa4" stroke="#496f69" strokeWidth="5" />
        <path d="M139 337 216 288l83 34-80 52z" fill="#b6d0ca" />
        <path d="m142 333 31-20 40 16-32 21z" fill="#f5eee1" />
        <path d="M119 352v28m103 13v25m97-89v26" stroke="#5b6f69" strokeWidth="7" />
        <GamingSetup x={245} y={227} />
        <path d="M358 171 423 130l32 13-66 43z" fill="#9f7b58" stroke="#664d39" strokeWidth="4" />
        <path d="M365 159 421 124v-48l-56 35z" fill="#6f543f" stroke="#523d2e" strokeWidth="4" />
        <path d="m374 137 13-8m8-5 13-8m8-5 13-8m-55 54 13-8m8-5 13-8m8-5 13-8" stroke="#e7b55e" strokeWidth="7" />
        <path d="M185 250 231 220l58 23-48 32z" fill="#698a99" stroke="#405b68" strokeWidth="4" />
        <path d="M194 245 230 222l47 19-38 25z" fill="#94b9c9" />
        <Plant x={413} y={192} />
        <text x="120" y="286" fill="#7c684d" fontSize="18" fontWeight="900">HOME · GAME ROOM</text>
      </g>

      <g className={styles.officeFurniture}>
        <path d="M510 310 639 226 786 281 651 370z" fill="none" stroke="#b9c7c5" strokeWidth="5" strokeDasharray="10 7" />
        <OfficeDesk x={525} y={333} accent="#f59e0b" />
        <OfficeDesk x={636} y={381} accent="#16a34a" />
        <OfficeDesk x={748} y={430} accent="#7c3aed" />
        <OfficeDesk x={612} y={472} accent="#0ea5e9" />
        <MeetingFurniture x={798} y={263} />
        <CafeCounter x={932} y={430} />
        <path d="M985 307 1056 334v-55l-71-27z" fill="#263a4c" stroke="#172638" strokeWidth="5" />
        <path d="m994 294 52 20v-27l-52-20z" fill="#75b8d0" />
        <path d="M1021 321v18" stroke="#53636d" strokeWidth="5" />
        <Plant x={515} y={286} /><Plant x={1061} y={368} /><Plant x={870} y={510} />
        <text x="884" y="575" fill="#71817a" fontSize="18" fontWeight="900">AI COMPANY · OFFICE</text>
      </g>
    </svg>
  );
}

function GamingSetup({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M0 40 80-11l114 43-85 56z" fill="#79583c" stroke="#4d3829" strokeWidth="5" />
      <path d="M12 41v38m97 9v35m85-91v34" stroke="#4d3829" strokeWidth="7" />
      <path d="M22 20 71-11v-48L22-28z" fill="#172132" stroke="#0b111d" strokeWidth="5" />
      <path d="m30 9 32-20v-31L30-22z" fill="#2589d8" />
      <path d="M82 30 132-2v-48L82-18z" fill="#172132" stroke="#0b111d" strokeWidth="5" />
      <path d="m90 19 33-21v-31L90-12z" fill="#7c3aed" />
      <path d="M73 19v17m59-38v18" stroke="#111827" strokeWidth="5" />
      <path d="m43 48 54-34 46 17-56 37z" fill="#252e3c" stroke="#111827" strokeWidth="3" />
      <path d="m56 47 31-20 27 10-32 21z" fill="#d8dee7" />
      <path d="m159 37 23-15 17 7-24 16v47l-18 11-23-9V51z" fill="#202b39" stroke="#101722" strokeWidth="4" />
      <circle cx="171" cy="48" r="3" fill="#4ade80" />
      <path d="m77 92 36-24 35 14-38 25v29l-33 21-35-14v-30z" fill="#40546a" stroke="#263544" strokeWidth="5" />
      <path d="m52 107 25-16 35 14-26 17z" fill="#60758a" />
    </g>
  );
}

function OfficeDesk({ x, y, accent }: { x: number; y: number; accent: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M0 25 64-16l88 33-67 44z" fill="#c8aa7c" stroke="#806c50" strokeWidth="4" />
      <path d="M8 27v28m77 6v25m67-69v25" stroke="#6f624e" strokeWidth="6" />
      <path d="M27 8 64-15v-37L27-29z" fill="#1f2a37" stroke="#101827" strokeWidth="4" />
      <path d="m34-1 23-15v-23L34-24z" fill={accent} />
      <path d="M63-14v20" stroke="#4b5563" strokeWidth="4" />
      <path d="m81 24 27-17 22 8-28 19z" fill="#e2e8f0" stroke="#768390" strokeWidth="3" />
      <path d="m96 62 23-15 23 9-24 16v25l-22 14-23-9V77z" fill="#677785" stroke="#42505c" strokeWidth="4" />
    </g>
  );
}

function MeetingFurniture({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M0 35 91-23l126 47-97 64z" fill="#c7a878" stroke="#806b4b" strokeWidth="5" />
      <path d="M16 35v33m104 20v34m97-98v34" stroke="#756246" strokeWidth="6" />
      <path d="m18 20 21-14 24 9-22 15zm45-29 21-14 24 9-22 15zm91 72 21-14 24 9-22 15zm-46 30 21-14 24 9-22 15z" fill="#788690" stroke="#53616c" strokeWidth="3" />
      <path d="m28 44 18-12m23 26 18-12m24 27 18-12" stroke="#f6f7f5" strokeWidth="5" />
    </g>
  );
}

function CafeCounter({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M0 38 102-27l91 34-106 70z" fill="#9d6e4d" stroke="#684931" strokeWidth="5" />
      <path d="M8 39v38m79 0v38m106-108v38" stroke="#67472f" strokeWidth="7" />
      <path d="m22 31 32-21 28 11-33 22z" fill="#eee4d6" stroke="#91775e" strokeWidth="3" />
      <path d="M29 20 51 6V-20L29-6z" fill="#263442" stroke="#17212c" strokeWidth="4" />
      <circle cx="42" cy="4" r="3" fill="#f59e0b" />
      <path d="m102 18 22-14 15 6-23 15zm38-24 22-14 15 6-23 15z" fill="#f7ead8" stroke="#b79d7d" strokeWidth="3" />
      <path d="m25 86 24-16 21 8-25 17zm83 26 24-16 21 8-25 17z" fill="#6f7c84" />
    </g>
  );
}

function Plant({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="m0 19 13-8 15 6-14 9z" fill="#9b7255" />
      <circle cx="13" cy="6" r="10" fill="#76a666" /><circle cx="4" cy="9" r="7" fill="#8ab779" /><circle cx="21" cy="10" r="7" fill="#5f9254" />
    </g>
  );
}
