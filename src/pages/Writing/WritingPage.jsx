import { useEffect, useMemo, useState } from 'react'
import data from '../../data/writing.json'
import { Card } from '../../components/shared/Card'
import { Button } from '../../components/shared/Button'
import { useProgress } from '../../hooks/useProgress'
import styles from './WritingPage.module.css'

const TYPES = [
  { id: 'all', label: 'Все' },
  { id: 'word_order', label: 'Часть A: порядок слов' },
  { id: 'write_character', label: 'Часть B: впиши иероглиф' },
]

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function WritingPage() {
  const { ensureTodaySession } = useProgress()
  const [type, setType] = useState('all')
  const [order, setOrder] = useState('shuffle')
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    ensureTodaySession()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const list = useMemo(() => {
    const base = type === 'all' ? data : data.filter((x) => x.type === type)
    return order === 'shuffle' ? shuffle(base) : base
  }, [order, type])

  const current = list[idx] ?? null

  useEffect(() => {
    setIdx(0)
  }, [type, order])

  function next() {
    setIdx((i) => (i + 1 >= list.length ? 0 : i + 1))
  }

  function prev() {
    setIdx((i) => (i - 1 < 0 ? Math.max(0, list.length - 1) : i - 1))
  }

  const title = current?.type === 'word_order' ? 'Часть A: порядок слов' : 'Часть B: впиши иероглиф'

  return (
    <div className={styles.wrap}>
      <div className={styles.top}>
        <div className={styles.titleRow}>
          <div className={styles.title}>Письмо</div>
          <div className={styles.meta}>
            Задание: <b>{Math.min(idx + 1, list.length)}</b> / <b>{list.length}</b>
          </div>
        </div>

        <Card className={styles.controls}>
          <div className={styles.row}>
            <label className={styles.label}>
              Тип
              <select className={styles.select} value={type} onChange={(e) => setType(e.target.value)}>
                {TYPES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.label}>
              Порядок
              <select className={styles.select} value={order} onChange={(e) => setOrder(e.target.value)}>
                <option value="shuffle">Случайно</option>
                <option value="in_order">По порядку</option>
              </select>
            </label>

            <div className={styles.hintBox}>
              <div className={styles.hintTitle}>Подсказка</div>
              <div className={styles.hintText}>
                A: соберите предложение кликами. B: впишите иероглиф по пиньиню.
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Card className={styles.card}>
        {!current ? (
          <div className={styles.empty}>Нет заданий для выбранного фильтра.</div>
        ) : (
          <>
            <div className={styles.cardTop}>
              <div className={styles.badges}>
                <span className={styles.badge}>{title}</span>
              </div>
            </div>

            {current.type === 'word_order' ? <WordOrderExercise ex={current} /> : <WriteCharacterExercise ex={current} />}

            <div className={styles.nav}>
              <Button type="button" variant="ghost" onClick={prev}>
                Назад
              </Button>
              <Button type="button" variant="primary" onClick={next}>
                Далее
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  )
}

function WordOrderExercise({ ex }) {
  const [picked, setPicked] = useState([])
  const [remaining, setRemaining] = useState(() => ex.words ?? [])
  const [checked, setChecked] = useState(null) // null | { ok }

  const sentence = picked.join('')

  function pickWord(w, idx) {
    if (checked) return
    setPicked((p) => [...p, w])
    setRemaining((r) => r.filter((_, i) => i !== idx))
  }

  function undoWord(w, idx) {
    if (checked) return
    setRemaining((r) => {
      const next = [...r]
      next.splice(0, 0, w)
      return next
    })
    setPicked((p) => p.filter((_, i) => i !== idx))
  }

  function reset() {
    setPicked([])
    setRemaining(ex.words ?? [])
    setChecked(null)
  }

  function check() {
    setChecked({ ok: sentence === ex.answer })
  }

  return (
    <div className={styles.block}>
      <div className={styles.promptTitle}>Составь предложение</div>
      <div className={styles.translation}>{ex.translation}</div>

      <div className={styles.builder}>
        {picked.length === 0 ? <span className={styles.builderHint}>Нажимайте слова ниже</span> : null}
        {picked.map((w, i) => (
          <button key={`${w}-${i}`} type="button" className={styles.chipPicked} onClick={() => undoWord(w, i)}>
            {w}
          </button>
        ))}
      </div>

      <div className={styles.hints}>
        {remaining.map((w, i) => (
          <button key={`${w}-${i}`} type="button" className={styles.chip} onClick={() => pickWord(w, i)}>
            {w}
          </button>
        ))}
      </div>

      {checked ? (
        <div className={checked.ok ? styles.feedbackOk : styles.feedbackBad}>
          {checked.ok ? (
            'Правильно.'
          ) : (
            <>
              Неправильно. Ответ: <b>{ex.answer}</b>
            </>
          )}
        </div>
      ) : null}

      <div className={styles.actions}>
        <Button type="button" variant="primary" onClick={check} disabled={picked.length === 0}>
          Проверить
        </Button>
        <Button type="button" variant="ghost" onClick={reset}>
          Сброс
        </Button>
      </div>
    </div>
  )
}

function WriteCharacterExercise({ ex }) {
  const [value, setValue] = useState('')
  const [checked, setChecked] = useState(null) // null | { ok }
  const [showHint, setShowHint] = useState(false)
  const [showAnswer, setShowAnswer] = useState(false)

  function check() {
    const ok = String(value).trim() === String(ex.answer).trim()
    setChecked({ ok })
  }

  function reset() {
    setValue('')
    setChecked(null)
    setShowHint(false)
    setShowAnswer(false)
  }

  return (
    <div className={styles.block}>
      <div className={styles.promptTitle}>Впиши иероглиф</div>
      <div className={styles.sentencePinyin}>{ex.sentence_with_pinyin}</div>
      <div className={styles.sub}>
        Пиньинь пропуска: <b>{ex.blank_pinyin}</b>
      </div>

      <div className={styles.inputRow}>
        <input
          className={styles.charInput}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="впишите иероглиф(ы)…"
          inputMode="text"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          disabled={checked?.ok === true}
        />
        <Button type="button" variant="primary" onClick={check} disabled={!value.trim() || checked != null}>
          Проверить
        </Button>
      </div>

      {checked ? (
        <div className={checked.ok ? styles.feedbackOk : styles.feedbackBad}>
          {checked.ok ? 'Правильно.' : 'Неправильно.'}
          {!checked.ok ? (
            <div className={styles.feedbackMeta}>
              Правильный ответ: <b>{ex.answer}</b>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className={styles.actions}>
        <Button type="button" size="sm" variant="ghost" onClick={() => setShowHint((v) => !v)}>
          {showHint ? 'Скрыть подсказку' : 'Показать подсказку'}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setShowAnswer((v) => !v)}>
          {showAnswer ? 'Скрыть ответ' : 'Показать ответ'}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={reset}>
          Сброс
        </Button>
      </div>

      {showHint ? (
        <div className={styles.hintPanel}>
          <div className={styles.hintTitle2}>Подсказка (черты/образ)</div>
          <div className={styles.hintChar}>{ex.stroke_order_hint || ex.answer}</div>
          <div className={styles.hintText2}>
            Сейчас это минимальная подсказка. Если хочешь, добавлю офлайн‑SVG порядка черт (stroke order) для top‑30.
          </div>
        </div>
      ) : null}

      {showAnswer ? (
        <div className={styles.answerPanel}>
          Ответ: <b className={styles.answerBig}>{ex.answer}</b>
        </div>
      ) : null}
    </div>
  )
}

