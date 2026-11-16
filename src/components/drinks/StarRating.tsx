import styles from "./Drinks.module.css";

export function StarRating({ rating, large = false }: { rating: number; large?: boolean }) {
  return <span className={`${styles.stars} ${large ? styles.largeStars : ""}`} role="img" aria-label={`5점 만점에 ${rating.toFixed(1)}점`}>
    <span aria-hidden="true" className={styles.starIcons}>{[1, 2, 3, 4, 5].map((star) => <span key={star} className={styles.star}>★<i style={{ width: `${Math.max(0, Math.min(1, rating - star + 1)) * 100}%` }}>★</i></span>)}</span>
    <strong aria-hidden="true">{rating.toFixed(1)}</strong>
  </span>;
}
