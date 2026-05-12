import { useEffect, useMemo, useState } from 'react'
import grammarData from '../../data/grammar.json'
import extra from '../../data/grammar.extra.json'
import { Card } from '../../components/shared/Card'
import { Button } from '../../components/shared/Button'
import { TTSButton } from '../../components/shared/TTSButton'
import { useProgress } from '../../hooks/useProgress'
import { useTTS } from '../../hooks/useTTS'
import styles from './GrammarPage.module.css'

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n))
}

function splitByBlanks(sentence) {
  return String(sentence).split('___')
}

export function GrammarPage() {
  return <GrammarPageImpl />
}

function GrammarPageImpl() {
  const { grammarProgress, setGrammarDone, ensureTodaySession } = useProgress()
  const { available: ttsAvailable, speak } = useTTS()

  const [selectedId, setSelectedId] = useState(() => grammarData[0]?.id ?? 1)
  const [exerciseIdx, setExerciseIdx] = useState(0)

  useEffect(() => {
    ensureTodaySession()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const doneCount = useMemo(() => Object.values(grammarProgress ?? {}).filter(Boolean).length, [grammarProgress])
  const extraById = useMemo(() => {
    const m = new Map()
    for (const e of extra ?? []) m.set(e.id, e.exercises ?? [])
    return m
  }, [])

  const selected = useMemo(() => {
    const base = grammarData.find((g) => g.id === selectedId) ?? grammarData[0]
    if (!base) return base
    const more = extraById.get(base.id) ?? []
    return { ...base, exercises: [...(base.exercises ?? []), ...more] }
  }, [extraById, selectedId])
  const isDone = Boolean(grammarProgress?.[String(selected?.id)])

  useEffect(() => {
    setExerciseIdx(0)
  }, [selectedId])

  const exercise = selected?.exercises?.[exerciseIdx] ?? null

  function speakZh(text, rate = 1.0) {
    speak(text, { lang: 'zh-CN', rate })
  }

  return (
    <div className={styles.layout}>
      <Card className={styles.sidebar}>
        <div className={styles.sideTop}>
          <div className={styles.sideTitle}>Грамматика</div>
          <div className={styles.sideMeta}>
            Пройдено: <b>{doneCount}</b> / <b>{grammarData.length}</b>
          </div>
        </div>

        <div className={styles.list} role="list">
          {grammarData.map((g) => {
            const done = Boolean(grammarProgress?.[String(g.id)])
            const active = g.id === selectedId
            return (
              <button
                key={g.id}
                type="button"
                className={[styles.item, active ? styles.itemActive : ''].filter(Boolean).join(' ')}
                onClick={() => setSelectedId(g.id)}
              >
                <span className={[styles.dot, done ? styles.dotDone : styles.dotTodo].join(' ')} aria-hidden="true" />
                <span className={styles.itemMain}>
                  <span className={styles.pattern}>{g.pattern}</span>
                  <span className={styles.name}>{g.name}</span>
                </span>
              </button>
            )
          })}
        </div>
      </Card>

      <div className={styles.content}>
        {!selected ? null : (
          <>
            <Card className={styles.header}>
              <div className={styles.hRow}>
                <div>
                  <div className={styles.hPattern}>{selected.pattern}</div>
                  <div className={styles.hName}>{selected.name}</div>
                </div>
                <div className={styles.hActions}>
                  <Button type="button" variant={isDone ? 'good' : 'primary'} onClick={() => setGrammarDone(selected.id, !isDone)}>
                    {isDone ? 'Пройдено' : 'Отметить пройдено'}
                  </Button>
                </div>
              </div>

              <div className={styles.expl}>{selected.explanation}</div>

              <div className={styles.examples}>
                {selected.examples?.map((ex, i) => (
                  <div key={i} className={styles.example}>
                    <div className={styles.exZhRow}>
                      <div className={styles.exZh}>{ex.zh}</div>
                      <TTSButton onSpeak={() => speakZh(ex.zh)} disabled={!ttsAvailable} />
                    </div>
                    <div className="pinyin">{ex.pinyin}</div>
                    <div className={styles.exRu}>{ex.ru}</div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className={styles.exerciseCard}>
              <div className={styles.exTop}>
                <div className={styles.exTitle}>
                  Упражнение {exerciseIdx + 1} / {selected.exercises?.length ?? 0}
                </div>
                <div className={styles.exNav}>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setExerciseIdx((i) => clamp(i - 1, 0, selected.exercises.length - 1))}>
                    Назад
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setExerciseIdx((i) => clamp(i + 1, 0, selected.exercises.length - 1))}>
                    Далее
                  </Button>
                </div>
              </div>

              {!exercise ? (
                <div className={styles.exEmpty}>Нет упражнений.</div>
              ) : exercise.type === 'fill_blank' ? (
                <FillBlankExercise key={exerciseIdx} ex={exercise} onSpeak={speakZh} ttsAvailable={ttsAvailable} />
              ) : exercise.type === 'word_order' ? (
                <WordOrderExercise key={exerciseIdx} ex={exercise} onSpeak={speakZh} ttsAvailable={ttsAvailable} />
              ) : exercise.type === 'translate' ? (
                <TranslateExercise key={exerciseIdx} ex={exercise} />
              ) : (
                <div className={styles.exEmpty}>Неизвестный тип упражнения: {exercise.type}</div>
              )}
            </Card>
          </>
        )}
      </div>
    </div>
  )
}

function FillBlankExercise({ ex, onSpeak, ttsAvailable }) {
  const parts = splitByBlanks(ex.sentence_zh)
  const blanks = ex.blanks ?? []
  const [inputs, setInputs] = useState(() => blanks.map(() => ''))
  const [checked, setChecked] = useState(null) // null | { ok, expected }

  const sentencePreview = useMemo(() => {
    let out = ''
    for (let i = 0; i < parts.length; i++) {
      out += parts[i]
      if (i < blanks.length) out += inputs[i] || '＿'
    }
    return out
  }, [blanks.length, inputs, parts])

  function check() {
    const ok = blanks.every((b, i) => String(inputs[i]).trim() === String(b).trim())
    setChecked({ ok })
  }

  function reset() {
    setInputs(blanks.map(() => ''))
    setChecked(null)
  }

  return (
    <div className={styles.exBody}>
      <div className={styles.exType}>Заполни пропуски</div>

      <div className={styles.zhRow}>
        <div className={styles.zhSentence}>
          {parts.map((p, i) => (
            <span key={i}>
              {p}
              {i < blanks.length ? (
                <input
                  className={styles.blank}
                  value={inputs[i]}
                  onChange={(e) => {
                    const v = e.target.value
                    setInputs((prev) => prev.map((x, j) => (j === i ? v : x)))
                  }}
                  placeholder="___"
                  disabled={checked?.ok === true}
                />
              ) : null}
            </span>
          ))}
        </div>
        <TTSButton onSpeak={() => onSpeak(sentencePreview)} disabled={!ttsAvailable} />
      </div>

      <div className={styles.hints}>
        {blanks.map((b, i) => (
          <span key={i} className={styles.chip}>
            {b}
          </span>
        ))}
      </div>

      {checked ? (
        <div className={checked.ok ? styles.feedbackOk : styles.feedbackBad}>
          {checked.ok ? 'Правильно.' : 'Есть ошибки — попробуйте ещё раз.'}
        </div>
      ) : null}

      <div className={styles.actions}>
        <Button type="button" variant="primary" onClick={check} disabled={inputs.some((x) => !String(x).trim())}>
          Проверить
        </Button>
        <Button type="button" variant="ghost" onClick={reset}>
          Сброс
        </Button>
      </div>
    </div>
  )
}

function WordOrderExercise({ ex, onSpeak, ttsAvailable }) {
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
    const ok = sentence === ex.answer
    setChecked({ ok })
  }

  return (
    <div className={styles.exBody}>
      <div className={styles.exType}>Составь предложение</div>

      <div className={styles.zhRow}>
        <div className={styles.builder}>
          {picked.length === 0 ? <span className={styles.builderHint}>Нажимайте слова ниже, чтобы собрать предложение</span> : null}
          {picked.map((w, i) => (
            <button key={`${w}-${i}`} type="button" className={styles.chipBtnPicked} onClick={() => undoWord(w, i)}>
              {w}
            </button>
          ))}
        </div>
        <TTSButton onSpeak={() => onSpeak(sentence || ex.answer)} disabled={!ttsAvailable} />
      </div>

      <div className={styles.hints}>
        {remaining.map((w, i) => (
          <button key={`${w}-${i}`} type="button" className={styles.chipBtn} onClick={() => pickWord(w, i)}>
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

function TranslateExercise({ ex }) {
  const [text, setText] = useState('')
  const [revealed, setRevealed] = useState(false)

  return (
    <div className={styles.exBody}>
      <div className={styles.exType}>Переведи на китайский (самопроверка)</div>

      <div className={styles.translateRu}>{ex.ru}</div>
      <div className={styles.hints}>
        {(ex.hint_words ?? []).map((w, i) => (
          <span key={i} className={styles.chip}>
            {w}
          </span>
        ))}
      </div>

      <textarea
        className={styles.textarea}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Напишите вариант по-китайски…"
        rows={3}
      />

      <div className={styles.actions}>
        <Button type="button" variant="primary" onClick={() => setRevealed(true)} disabled={!text.trim()}>
          Я написал(а)
        </Button>
        <Button type="button" variant="ghost" onClick={() => { setText(''); setRevealed(false) }}>
          Очистить
        </Button>
      </div>

      {revealed ? (
        <div className={styles.selfCheck}>
          <div className={styles.selfTitle}>Самопроверка</div>
          <div className={styles.selfHint}>
            В данных для этого типа упражнения нет «единственного правильного ответа», поэтому ориентируйтесь на подсказки и конструкцию урока.
          </div>
        </div>
      ) : null}
    </div>
  )
}

