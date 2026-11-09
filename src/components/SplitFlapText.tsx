import type { CSSProperties } from "react";
import styles from "./SplitFlapText.module.css";

type SplitFlapTextProps = {
  value: string;
  className?: string;
  delayMs?: number;
  repeat?: boolean;
};

type FlapStyle = CSSProperties & { "--flap-delay": string };

export function SplitFlapText({ value, className = "", delayMs = 0, repeat = false }: SplitFlapTextProps) {
  return (
    <span className={`${styles.text} ${repeat ? styles.repeat : ""} ${className}`} aria-label={value}>
      {Array.from(value).map((character, index) => {
        if (character === " ") return <span key={`space-${index}`} className={styles.space} aria-hidden="true" />;

        const previous = getPreviousCharacter(character, index);
        const style: FlapStyle = { "--flap-delay": `${delayMs + index * 38}ms` };
        const isWide = !/[\x00-\x7F]/.test(character);

        return (
          <span key={`${character}-${index}`} className={`${styles.flap} ${isWide ? styles.wide : ""}`} style={style} aria-hidden="true">
            <span className={styles.top}><span className={styles.glyph}>{character}</span></span>
            <span className={styles.bottom}><span className={styles.glyph}>{character}</span></span>
            <span className={styles.flipTop}><span className={styles.glyph}>{previous}</span></span>
            <span className={styles.flipBottom}><span className={styles.glyph}>{character}</span></span>
          </span>
        );
      })}
    </span>
  );
}

function getPreviousCharacter(character: string, index: number) {
  if (/\d/.test(character)) return String((Number(character) + 9) % 10);
  if (/[A-Z]/.test(character)) return String.fromCharCode(((character.charCodeAt(0) - 65 + 25) % 26) + 65);
  if (/[a-z]/.test(character)) return String.fromCharCode(((character.charCodeAt(0) - 97 + 25) % 26) + 97);
  if (/[가-힣]/.test(character)) return ["가", "나", "다", "라", "마", "바"][(character.charCodeAt(0) + index) % 6];
  return "·";
}
