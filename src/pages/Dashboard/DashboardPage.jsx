import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import words from '../../data/words.json'
import grammar from '../../data/grammar.json'
import { Card } from '../../components/shared/Card'
import { ProgressRing } from '../../components/shared/ProgressRing'
import { useProgress } from '../../hooks/useProgress'
import styles from './DashboardPage.module.css'

function daysUntil(isoDate) {
  const d = new Date(`${isoDate}T00:00:00`)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.ceil((d.getTime() - today.getTime()) / (24 * 60 * 60 * 1000))
}

export function DashboardPage() {
  const { wordsProgress, grammarProgress, examResults, streak, examDate, setExamDate } = useProgress()

  const knownWords = useMemo(
    () => words.filter((w) => (wordsProgress?.[String(w.id)]?.status ?? 'new') === 'known').length,
    [wordsProgress],
  )

  const grammarDone = useMemo(() => Object.values(grammarProgress ?? {}).filter(Boolean).length, [grammarProgress])

  const testsDone = examResults?.length ?? 0
  const d = daysUntil(examDate)

  return (
    <div className={styles.grid}>
      <Card className={styles.hero}>
        <div className={styles.heroTop}>
          <div>
            <div className={styles.hTitle}>До экзамена</div>
            <div className={styles.days}>
              {Number.isFinite(d) ? (
                d >= 0 ? (
                  <>
                    <span className={styles.daysNum}>{d}</span> <span className={styles.daysUnit}>дн.</span>
                  </>
                ) : (
                  <>
                    <span className={styles.daysNum}>{Math.abs(d)}</span> <span className={styles.daysUnit}>дн. назад</span>
                  </>
                )
              ) : (
                <span className={styles.daysNum}>—</span>
              )}
            </div>
          </div>

          <div className={styles.streak}>
            <div className={styles.streakNum}>{streak?.count ?? 0}</div>
            <div className={styles.streakLabel}>streak (дней подряд)</div>
            <div className={styles.streakMeta}>последняя сессия: {streak?.last_date ?? '—'}</div>
          </div>
        </div>

        <div className={styles.examRow}>
          <label className={styles.label}>
            Дата экзамена
            <input
              className={styles.input}
              type="date"
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
            />
          </label>
        </div>
      </Card>

      <Card className={styles.panel}>
        <div className={styles.panelTitle}>Прогресс</div>
        <div className={styles.rings}>
          <ProgressRing value={knownWords} max={words.length} label="Слова" sublabel="выучено" />
          <ProgressRing value={grammarDone} max={grammar.length} label="Грамматика" sublabel="пройдено" />
          <ProgressRing value={testsDone} max={10} label="Тесты" sublabel="результатов" />
        </div>
        <div className={styles.hint}>
          Совет: начните со слов «изучаемые», а затем добавляйте «новые». Если слово ответили правильно 3 раза подряд —
          оно становится «выученным».
        </div>
      </Card>

      <div className={styles.quickStart}>
        <div className={styles.quickTitle}>Быстрый старт</div>
        <Card className={styles.challenge}>
          <div className={styles.challengeTitle}>Daily челлендж</div>
          <div className={styles.challengeText}>
            Закрой 3 активности за день: слова, аудирование и 1 мини‑тест. Серия дней растет быстрее и прогресс заметнее.
          </div>
          <div className={styles.challengeActions}>
            <QuickAction to="/words" label="Начать слова" />
            <QuickAction to="/listening" label="Тренировать аудио" />
            <QuickAction to="/mock" label="Пройти тест" />
          </div>
        </Card>
        <div className={styles.quickGrid}>
          <QuickLink to="/words" title="Слова" desc="флэшкарты и тесты" />
          <QuickLink to="/grammar" title="Грамматика" desc="22 конструкции HSK 3" />
          <QuickLink to="/listening" title="Аудирование" desc="формат HSK 3" />
          <QuickLink to="/reading" title="Чтение" desc="формат HSK 3" />
          <QuickLink to="/writing" title="Письмо" desc="порядок слов + иероглиф" />
          <QuickLink to="/mock" title="Полный тест" desc="таймеры и разбор" />
        </div>
      </div>
    </div>
  )
}

function QuickAction({ to, label }) {
  return (
    <Link to={to} className={styles.quickAction}>
      {label}
    </Link>
  )
}

function QuickLink({ to, title, desc }) {
  return (
    <Card as={Link} to={to} className={styles.quickCard}>
      <div className={styles.quickCardTitle}>{title}</div>
      <div className={styles.quickCardDesc}>{desc}</div>
    </Card>
  )
}

