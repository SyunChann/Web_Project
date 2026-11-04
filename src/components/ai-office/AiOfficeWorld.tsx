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

      <g className={styles.homeFurniture}>
        <IsoDesk x={256} y={218} accent="#2563eb" />
        <path d="M321 276l58-37 59 23-60 40z" fill="#73859b" stroke="#465569" strokeWidth="4" />
        <path d="M337 248l25-16 27 11-26 17z" fill="#192233" /><path d="M393 271l24-15 12 5-25 17z" fill="#192233" />
        <path d="M149 354l78-50 80 37-80 54z" fill="#7fa6a2" stroke="#426c69" strokeWidth="5" />
        <path d="M161 334l57-36 65 29-59 39z" fill="#91bbb7" />
        <Plant x={412} y={152} />
        <text x="128" y="278" fill="#84735a" fontSize="18" fontWeight="800">SYUN&apos;S HOME</text>
      </g>

      <g className={styles.officeFurniture}>
        <IsoDesk x={540} y={365} accent="#f59e0b" />
        <IsoDesk x={655} y={421} accent="#16a34a" />
        <IsoDesk x={782} y={477} accent="#7c3aed" />
        <path d="M773 295l82-53 99 37-87 57z" fill="#c6a87c" stroke="#7e6b50" strokeWidth="4" />
        <path d="M795 299l12-8 18 7-13 8zm42 16 12-8 18 7-13 8zm43-46 12-8 18 7-13 8z" fill="#73808b" />
        <path d="M924 461l105-65 70 25-108 70z" fill="#b7865e" stroke="#79553a" strokeWidth="4" />
        <path d="M945 452l24-15 26 10-25 16zm57-35 24-15 26 10-25 16z" fill="#f1e3cb" />
        <Plant x={501} y={300} /><Plant x={1049} y={347} />
        <text x="905" y="565" fill="#84908c" fontSize="18" fontWeight="800">PIXEL AI COMPANY</text>
      </g>

      <path d="M470 487 569 527 625 491 526 453z" fill="#d1d5d1" stroke="#bbc0bb" strokeWidth="3" />
      <path d="m491 488 18 7m20 8 18 7m20 8 18 7" stroke="#fff" strokeWidth="9" />
      <text x="482" y="548" fill="#98a09b" fontSize="13" fontWeight="700">HOME ⇄ OFFICE</text>
    </svg>
  );
}

function IsoDesk({ x, y, accent }: { x: number; y: number; accent: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M0 26 66-16l83 31-69 45z" fill="#c8b08b" stroke="#7b6a50" strokeWidth="4" />
      <path d="M21 8 50-10l34 13-30 20z" fill="#202d3c" stroke="#101827" strokeWidth="3" />
      <path d="M26 5 49-9l27 10-24 15z" fill={accent} />
      <path d="M51 22v12m32-33v13" stroke="#66727d" strokeWidth="4" />
      <path d="m91 42 23-15 21 8-24 16z" fill="#6b7780" />
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
