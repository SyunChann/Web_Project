"use client";

import type { CSSProperties, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { Armchair, Building2, Coffee, Footprints, Gamepad2, House, MapPin, Monitor, MousePointer2, Sparkles, Users } from "lucide-react";
import styles from "./AiOfficeWorld.module.css";

type Position = { x: number; y: number };
type Region = "home" | "office";
type Spot = Position & { id: string; name: string; room: string; action: string; shortAction: string; color: string; region: Region; icon: ReactNode };

const spots: Spot[] = [
  { id: "game", name: "게임룸", room: "HOME", action: "게임을 즐기는 중", shortAction: "게임 시작", x: 19, y: 27, color: "#5b8def", region: "home", icon: <Gamepad2 size={15} /> },
  { id: "rest", name: "휴식 공간", room: "HOME", action: "집에서 쉬는 중", shortAction: "휴식 시작", x: 17, y: 75, color: "#8ab05c", region: "home", icon: <Armchair size={15} /> },
  { id: "planning", name: "기획팀", room: "AI COMPANY", action: "새 기능을 기획하는 중", shortAction: "기획 시작", x: 55, y: 29, color: "#e8a23b", region: "office", icon: <Sparkles size={15} /> },
  { id: "meeting", name: "회의실", room: "AI COMPANY", action: "팀 회의에 참여 중", shortAction: "회의 참여", x: 83, y: 28, color: "#9b7bd2", region: "office", icon: <Users size={15} /> },
  { id: "development", name: "개발팀", room: "AI COMPANY", action: "코드를 작성하는 중", shortAction: "개발 시작", x: 57, y: 72, color: "#4fa878", region: "office", icon: <Monitor size={15} /> },
  { id: "cafe", name: "오피스 카페", room: "AI COMPANY", action: "커피를 마시는 중", shortAction: "커피 마시기", x: 84, y: 73, color: "#d77b4b", region: "office", icon: <Coffee size={15} /> },
];

const initialSpot = spots[1];
const HOME_HUB = { x: 30, y: 52 };
const HOME_DOOR = { x: 35, y: 52 };
const ROAD = { x: 39.5, y: 52 };
const OFFICE_DOOR = { x: 44, y: 52 };
const OFFICE_HUB = { x: 48, y: 52 };

function routeTo(from: Position, destination: Spot): Position[] {
  const fromRegion: Region = from.x < 40 ? "home" : "office";
  if (fromRegion === destination.region) {
    const hub = destination.region === "home" ? HOME_HUB : OFFICE_HUB;
    return [hub, { x: hub.x, y: destination.y }, destination];
  }
  if (destination.region === "office") {
    return [HOME_HUB, HOME_DOOR, ROAD, OFFICE_DOOR, OFFICE_HUB, { x: OFFICE_HUB.x, y: destination.y }, destination];
  }
  return [OFFICE_HUB, OFFICE_DOOR, ROAD, HOME_DOOR, HOME_HUB, { x: HOME_HUB.x, y: destination.y }, destination];
}

export function AiOfficeWorld() {
  const [position, setPosition] = useState<Position>({ x: initialSpot.x, y: initialSpot.y });
  const [currentSpot, setCurrentSpot] = useState(initialSpot.id);
  const [movingTo, setMovingTo] = useState<string | null>(null);
  const [activity, setActivity] = useState(initialSpot.action);
  const [logs, setLogs] = useState([`휴식 공간 · ${initialSpot.shortAction}`]);
  const moveTimer = useRef<number | null>(null);
  const positionRef = useRef(position);

  useEffect(() => () => { if (moveTimer.current) window.clearTimeout(moveTimer.current); }, []);

  function move(nextPosition: Position) {
    positionRef.current = nextPosition;
    setPosition(nextPosition);
  }

  function visit(spot: Spot) {
    if (moveTimer.current) window.clearTimeout(moveTimer.current);
    if (spot.id === currentSpot && !movingTo) { setActivity(spot.action); return; }

    const route = routeTo(positionRef.current, spot);
    let routeIndex = 0;
    setMovingTo(spot.id);
    setActivity(`${spot.name}(으)로 이동 중`);

    const walk = () => {
      move(route[routeIndex]);
      routeIndex += 1;
      if (routeIndex < route.length) { moveTimer.current = window.setTimeout(walk, 430); return; }
      moveTimer.current = window.setTimeout(() => {
        setCurrentSpot(spot.id);
        setMovingTo(null);
        setActivity(spot.action);
        setLogs((items) => [`${spot.name} · ${spot.shortAction}`, ...items.filter((item) => !item.startsWith(`${spot.name} ·`))].slice(0, 4));
      }, 450);
    };
    walk();
  }

  const selected = spots.find((spot) => spot.id === (movingTo ?? currentSpot)) ?? initialSpot;

  return (
    <div className={styles.shell}>
      <header className={styles.hero}>
        <div>
          <p className={styles.eyebrow}><Sparkles size={15} /> PIXEL WORKSPACE</p>
          <h1>AI Office</h1>
          <p>장소를 클릭하면 캐릭터가 길을 찾아 이동하고 그곳의 일을 시작합니다.</p>
        </div>
        <div className={styles.liveBadge}><i /> OFFICE ONLINE</div>
      </header>

      <div className={styles.workspace}>
        <section className={styles.mapWindow} aria-label="AI 오피스 픽셀 맵">
          <div className={styles.windowBar}>
            <div className={styles.windowLights}><i /><i /><i /></div>
            <strong>SYUN&apos;S WORKSPACE</strong><span>MAP 01</span>
          </div>
          <div className={styles.mapFrame}>
            <div className={styles.pixelMap}>
              <PixelOfficeMap />
              <div className={`${styles.avatar} ${movingTo ? styles.avatarMoving : ""}`} style={{ "--avatar-x": `${position.x}%`, "--avatar-y": `${position.y}%` } as CSSProperties} aria-label={`SYUN, ${activity}`}>
                <span className={styles.speechBubble}>{movingTo ? "이동 중..." : selected.shortAction}</span>
                <span className={styles.avatarShadow} /><span className={styles.avatarHair} />
                <span className={styles.avatarFace}><i /><i /></span><span className={styles.avatarBody}>S</span><span className={styles.avatarLegs}><i /><i /></span>
              </div>
              {spots.map((spot) => {
                const active = spot.id === currentSpot && !movingTo;
                const destination = spot.id === movingTo;
                return (
                  <button key={spot.id} type="button" onClick={() => visit(spot)} className={`${styles.spot} ${active ? styles.spotActive : ""} ${destination ? styles.spotMoving : ""}`} style={{ "--spot-x": `${spot.x}%`, "--spot-y": `${spot.y}%`, "--spot-color": spot.color } as CSSProperties} aria-pressed={active}>
                    <span>{spot.icon}</span><strong>{spot.name}</strong>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <aside className={styles.console} aria-label="오피스 이동 패널">
          <div className={styles.consoleTitle}>
            <div><span className={styles.consoleIcon}><Building2 size={18} /></span><div><small>AI OFFICE</small><strong>이동 콘솔</strong></div></div>
            <span className={styles.onlineDot}>ONLINE</span>
          </div>
          <div className={styles.currentCard} aria-live="polite">
            <div className={styles.cardLabel}><MapPin size={13} /> CURRENT STATUS</div>
            <div className={styles.currentPlace}><span style={{ "--spot-color": selected.color } as CSSProperties}>{selected.icon}</span><div><small>{selected.room}</small><strong>{selected.name}</strong></div></div>
            <p className={movingTo ? styles.movingText : ""}>{activity}</p>
          </div>
          <div className={styles.panelSection}>
            <div className={styles.sectionHeading}><span>QUICK MOVE</span><small>CLICK TO GO</small></div>
            <div className={styles.quickGrid}>
              {spots.map((spot) => (
                <button key={spot.id} type="button" onClick={() => visit(spot)} className={spot.id === (movingTo ?? currentSpot) ? styles.quickActive : ""}>
                  <span style={{ color: spot.color }}>{spot.icon}</span><strong>{spot.name}</strong><small>{spot.room}</small>
                </button>
              ))}
            </div>
          </div>
          <div className={`${styles.panelSection} ${styles.activitySection}`}>
            <div className={styles.sectionHeading}><span>ACTIVITY LOG</span><small>RECENT</small></div>
            <ol className={styles.activityLog}>{logs.map((log, index) => <li key={log}><i className={index === 0 ? styles.logCurrent : ""} /><span>{log}</span></li>)}</ol>
          </div>
          <div className={styles.consoleHint}><MousePointer2 size={16} /><span><strong>직접 움직일 필요 없음</strong>맵의 라벨이나 이동 버튼을 선택하세요.</span></div>
        </aside>
      </div>

      <section className={styles.helpBar}>
        <Footprints size={18} /><div><strong>자동 경로 이동</strong><p>집 출입구, 보행로와 회사 복도를 차례로 지나 선택한 장소로 이동합니다.</p></div>
        <div className={styles.placeLegend}><span><House size={14} /> HOME</span><i /><span><Building2 size={14} /> AI COMPANY</span></div>
      </section>
    </div>
  );
}

function PixelOfficeMap() {
  return (
    <div className={styles.mapArt} aria-hidden="true">
      <div className={styles.grass} /><div className={styles.road}><i /><i /><i /><i /><i /></div><div className={styles.walkway} />
      <div className={styles.homeBuilding}>
        <div className={styles.roomTitle}>HOME</div><div className={styles.homeDivider} /><div className={styles.homeDoor} />
        <div className={styles.gameDesk}><span className={styles.monitor}><i /></span><span className={styles.monitor}><i /></span><span className={styles.keyboard} /><span className={styles.pcTower}><i /><i /></span><span className={styles.deskChair} /></div>
        <div className={styles.wallShelf}><i /><i /><i /><i /></div><div className={styles.gameRug}><span>+</span></div>
        <div className={styles.bed}><span /><i /></div><div className={styles.sofa}><span /><span /></div><div className={styles.smallTable}><i /><i /></div><Plant className={styles.homePlant} />
      </div>
      <div className={styles.officeBuilding}>
        <div className={styles.roomTitle}>AI COMPANY</div><div className={styles.officeDoor} /><div className={styles.officeHall}><span>WELCOME</span></div>
        <div className={styles.planningRoom}><span>PLANNING</span></div><div className={styles.meetingRoom}><span>MEETING</span></div><div className={styles.developmentRoom}><span>DEVELOPMENT</span></div><div className={styles.cafeRoom}><span>CAFE</span></div>
        <PixelDesk x={7} y={13} color="#e8a23b" /><PixelDesk x={22} y={13} color="#e8a23b" /><PixelDesk x={7} y={31} color="#e8a23b" />
        <PixelDesk x={9} y={61} color="#4fa878" /><PixelDesk x={25} y={61} color="#4fa878" /><PixelDesk x={9} y={79} color="#4fa878" /><PixelDesk x={25} y={79} color="#4fa878" />
        <div className={styles.meetingTable}><i /><i /><i /><i /><span /></div><div className={styles.presentationScreen}><i /><span /><span /><span /></div>
        <div className={styles.cafeCounter}><span className={styles.coffeeMachine}><i /></span><span className={styles.cups}><i /><i /><i /></span></div><div className={`${styles.cafeStool} ${styles.stoolOne}`} /><div className={`${styles.cafeStool} ${styles.stoolTwo}`} />
        <Plant className={styles.officePlantOne} /><Plant className={styles.officePlantTwo} />
      </div>
    </div>
  );
}

function PixelDesk({ x, y, color }: { x: number; y: number; color: string }) {
  return <div className={styles.pixelDesk} style={{ left: `${x}%`, top: `${y}%`, "--desk-screen": color } as CSSProperties}><span className={styles.deskMonitor}><i /></span><span className={styles.deskKeyboard} /><span className={styles.deskMug} /><span className={styles.officeChair} /></div>;
}

function Plant({ className }: { className: string }) { return <div className={`${styles.plant} ${className}`}><i /><i /><i /><span /></div>; }
