import styles from './ProgressRing.module.css'

export function ProgressRing({ value, max, label, sublabel }) {
  const v = Math.max(0, Math.min(max, value))
  const pct = max > 0 ? v / max : 0
  const r = 22
  const c = 2 * Math.PI * r
  const dash = c * (1 - pct)

  return (
    <div className={styles.wrap} aria-label={label}>
      <svg viewBox="0 0 64 64" className={styles.svg} role="img">
        <circle className={styles.bg} cx="32" cy="32" r={r} />
        <circle
          className={styles.fg}
          cx="32"
          cy="32"
          r={r}
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={dash}
        />
      </svg>
      <div className={styles.center}>
        <div className={styles.value}>
          {v}/{max}
        </div>
        <div className={styles.label}>{label}</div>
        {sublabel ? <div className={styles.sublabel}>{sublabel}</div> : null}
      </div>
    </div>
  )
}

