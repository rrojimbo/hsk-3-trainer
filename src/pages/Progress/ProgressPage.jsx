export function ProgressPage() {
  return <ProgressPageImpl />
}

import { useMemo, useState } from 'react'
import { Card } from '../../components/shared/Card'
import { Button } from '../../components/shared/Button'
import words from '../../data/words.json'
import grammar from '../../data/grammar.json'
import { useProgress } from '../../hooks/useProgress'
import styles from './ProgressPage.module.css'

function toISO(d) {
  return d.toISOString().slice(0, 10)
}

function startOfWeekMonday(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const day = d.getDay() // 0..6 (Sun..Sat)
  const diff = (day + 6) % 7 // Monday=0
  d.setDate(d.getDate() - diff)
  return d
}

function ProgressPageImpl() {
  const { wordsProgress, grammarProgress, examResults, dailySessions, streak } = useProgress()
  const [shareMsg, setShareMsg] = useState('')

  const knownWords = useMemo(
    () => words.filter((w) => (wordsProgress?.[String(w.id)]?.status ?? 'new') === 'known').length,
    [wordsProgress],
  )
  const hardWords = useMemo(
    () => words.filter((w) => (wordsProgress?.[String(w.id)]?.status ?? '') === 'hard').length,
    [wordsProgress],
  )
  const grammarDone = useMemo(() => Object.values(grammarProgress ?? {}).filter(Boolean).length, [grammarProgress])

  const weakWords = useMemo(() => {
    const all = words
      .map((w) => {
        const p = wordsProgress?.[String(w.id)]
        return { w, wrong: Number(p?.wrongCount ?? 0), status: p?.status ?? 'new' }
      })
      .filter((x) => x.wrong > 0)
      .sort((a, b) => b.wrong - a.wrong)
    return all.slice(0, 15)
  }, [wordsProgress])

  const sessionsSet = useMemo(() => new Set((dailySessions ?? []).map(String)), [dailySessions])
  const calendar = useMemo(() => {
    const weeks = 12
    const now = new Date()
    const start = startOfWeekMonday(new Date(now.getTime() - (weeks - 1) * 7 * 24 * 60 * 60 * 1000))
    const days = []
    for (let i = 0; i < weeks * 7; i++) {
      const d = new Date(start.getTime())
      d.setDate(start.getDate() + i)
      const iso = toISO(d)
      days.push({ iso, month: d.getMonth(), day: d.getDate(), done: sessionsSet.has(iso) })
    }
    return { days, weeks }
  }, [sessionsSet])

  const lastResults = useMemo(() => {
    const arr = Array.isArray(examResults) ? [...examResults] : []
    return arr.slice(-10).reverse()
  }, [examResults])

  const readiness = useMemo(() => {
    const wordsPct = Math.round((knownWords / Math.max(1, words.length)) * 100)
    const grammarPct = Math.round((grammarDone / Math.max(1, grammar.length)) * 100)
    const last = Array.isArray(examResults) && examResults.length ? examResults[examResults.length - 1] : null
    return { wordsPct, grammarPct, last }
  }, [examResults, grammarDone, knownWords])

  async function shareProgress() {
    const pctWords = readiness.wordsPct
    const pctGrammar = readiness.grammarPct
    const text = `Учу HSK 3: слова ${pctWords}%, грамматика ${pctGrammar}%, streak ${streak?.count ?? 0} дней. Присоединяйся!`
    const url = window.location.origin
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'HSK 3 Тренажер',
          text,
          url,
        })
        setShareMsg('Супер, шаринг открыт.')
        return
      }
      await navigator.clipboard.writeText(`${text} ${url}`)
      setShareMsg('Ссылка и текст скопированы.')
    } catch {
      setShareMsg('Не удалось поделиться. Попробуй снова.')
    }
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.titleRow}>
        <div className={styles.title}>Прогресс</div>
        <div className={styles.metaWrap}>
          <div className={styles.meta}>
            streak: <b>{streak?.count ?? 0}</b> (последняя сессия: {streak?.last_date ?? '—'})
          </div>
          <Button type="button" size="sm" variant="primary" onClick={shareProgress}>
            Поделиться прогрессом
          </Button>
        </div>
      </div>
      {shareMsg ? <div className={styles.shareMsg}>{shareMsg}</div> : null}

      <div className={styles.grid}>
        <Card className={styles.card}>
          <div className={styles.cardTitle}>Готовность</div>
          <div className={styles.kpis}>
            <Kpi title="Слова" value={`${readiness.wordsPct}%`} sub={`${knownWords}/${words.length} выучено`} />
            <Kpi title="Грамматика" value={`${readiness.grammarPct}%`} sub={`${grammarDone}/${grammar.length} пройдено`} />
            <Kpi
              title="Пробники"
              value={`${(examResults?.length ?? 0)}`}
              sub={readiness.last ? `последний: L${readiness.last.listening}% R${readiness.last.reading}% W${readiness.last.writing}%` : '—'}
            />
          </div>
          <div className={styles.hint}>
            Подсказка: “сложные” слова ({hardWords}) лучше прогонять чаще, а слабые места — смотреть ниже.
          </div>
        </Card>

        <Card className={styles.card}>
          <div className={styles.cardTitle}>Календарь занятий (12 недель)</div>
          <div className={styles.calendar}>
            {calendar.days.map((d) => (
              <div
                key={d.iso}
                className={[styles.day, d.done ? styles.dayOn : styles.dayOff].join(' ')}
                title={`${d.iso}${d.done ? ' • занятие' : ''}`}
                aria-label={d.iso}
              />
            ))}
          </div>
          <div className={styles.legend}>
            <span className={[styles.legendDot, styles.dayOff].join(' ')} /> нет занятий
            <span className={[styles.legendDot, styles.dayOn].join(' ')} /> есть занятие
          </div>
        </Card>

        <Card className={styles.card}>
          <div className={styles.cardTitle}>Слабые слова (по ошибкам)</div>
          {weakWords.length === 0 ? (
            <div className={styles.muted}>Пока нет ошибок по словам — отлично.</div>
          ) : (
            <div className={styles.weakList}>
              {weakWords.map(({ w, wrong, status }) => (
                <div key={w.id} className={styles.weakItem}>
                  <div className={styles.weakMain}>
                    <span className={styles.hanzi}>{w.hanzi}</span>
                    <span className={styles.pinyin}>{w.pinyin}</span>
                    <span className={styles.tr}>{w.translation}</span>
                  </div>
                  <div className={styles.weakMeta}>
                    ошибок: <b>{wrong}</b> • статус: <b>{status}</b>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className={styles.card}>
          <div className={styles.cardTitle}>История результатов Mock Exam</div>
          {lastResults.length === 0 ? (
            <div className={styles.muted}>Пока нет результатов. Пройди «Полный тест» — и они появятся здесь.</div>
          ) : (
            <div className={styles.results}>
              {lastResults.map((r, i) => (
                <div key={`${r.date}-${i}`} className={styles.resultRow}>
                  <div className={styles.resultDate}>{r.date}</div>
                  <div className={styles.resultScores}>
                    <span>
                      L <b>{r.listening}%</b>
                    </span>
                    <span>
                      R <b>{r.reading}%</b>
                    </span>
                    <span>
                      W <b>{r.writing}%</b>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

function Kpi({ title, value, sub }) {
  return (
    <div className={styles.kpi}>
      <div className={styles.kpiTitle}>{title}</div>
      <div className={styles.kpiValue}>{value}</div>
      <div className={styles.kpiSub}>{sub}</div>
    </div>
  )
}

