import { useEffect, useMemo, useState } from 'react'
import listening from '../../data/listening.json'
import reading from '../../data/reading.json'
import writing from '../../data/writing.json'
import { Card } from '../../components/shared/Card'
import { Button } from '../../components/shared/Button'
import { TTSButton } from '../../components/shared/TTSButton'
import { useProgress } from '../../hooks/useProgress'
import { useTimer } from '../../hooks/useTimer'
import { useTTS } from '../../hooks/useTTS'
import styles from './MockExamPage.module.css'

const SECTION = {
  intro: 'intro',
  listening: 'listening',
  reading: 'reading',
  writing: 'writing',
  done: 'done',
}

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function pct(correct, total) {
  if (!total) return 0
  return Math.round((correct / total) * 100)
}

export function MockExamPage() {
  const { addExamResult, ensureTodaySession } = useProgress()
  const { available: ttsAvailable, speak, cancel } = useTTS()

  const [section, setSection] = useState(SECTION.intro)

  const [listeningItems, setListeningItems] = useState([])
  const [readingItems, setReadingItems] = useState([])
  const [writingItems, setWritingItems] = useState([])

  const [idx, setIdx] = useState(0)

  // answers maps by section: index -> answer
  const [ansListening, setAnsListening] = useState([])
  const [ansReading, setAnsReading] = useState([])
  const [ansWriting, setAnsWriting] = useState([]) // for word_order: array of picked sentence, for write_character: typed string

  const timer = useTimer({ initialSeconds: 0, autoStart: false })

  useEffect(() => {
    ensureTodaySession()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const currentList = section === SECTION.listening ? listeningItems : section === SECTION.reading ? readingItems : writingItems
  const current = currentList[idx] ?? null

  const totalInSection =
    section === SECTION.listening ? listeningItems.length : section === SECTION.reading ? readingItems.length : writingItems.length

  const progressPercent = totalInSection ? Math.round(((idx + 1) / totalInSection) * 100) : 0

  function startExam() {
    cancel()
    const l = shuffle(listening).slice(0, 40)
    const r = shuffle(reading).slice(0, 30)

    const wordOrder = shuffle(writing.filter((x) => x.type === 'word_order')).slice(0, 5)
    const writeChar = shuffle(writing.filter((x) => x.type === 'write_character')).slice(0, 5)
    const w = shuffle([...wordOrder, ...writeChar]).slice(0, 10)

    setListeningItems(l)
    setReadingItems(r)
    setWritingItems(w)

    setAnsListening(Array(40).fill(null))
    setAnsReading(Array(30).fill(null))
    setAnsWriting(Array(10).fill(null))

    setIdx(0)
    setSection(SECTION.listening)
    timer.reset(35 * 60)
    timer.start()
  }

  function speakListening() {
    if (!current || section !== SECTION.listening) return
    const text =
      current.type === 'true_false'
        ? current.text_zh
        : current.type === 'picture_description'
          ? current.description_zh
          : current.dialogue_zh
    speak(String(text).replaceAll('\n', ' '), { lang: 'zh-CN', rate: 1.0 })
  }

  function setAnswer(val) {
    if (section === SECTION.listening) {
      setAnsListening((prev) => {
        const next = [...prev]
        next[idx] = val
        return next
      })
    } else if (section === SECTION.reading) {
      setAnsReading((prev) => {
        const next = [...prev]
        next[idx] = val
        return next
      })
    } else if (section === SECTION.writing) {
      setAnsWriting((prev) => {
        const next = [...prev]
        next[idx] = val
        return next
      })
    }
  }

  function goNext() {
    cancel()
    const nextIdx = idx + 1
    if (nextIdx < currentList.length) {
      setIdx(nextIdx)
      return
    }
    // section finished
    if (section === SECTION.listening) {
      setSection(SECTION.reading)
      setIdx(0)
      timer.reset(30 * 60)
      timer.start()
      return
    }
    if (section === SECTION.reading) {
      setSection(SECTION.writing)
      setIdx(0)
      timer.reset(15 * 60)
      timer.start()
      return
    }
    if (section === SECTION.writing) {
      timer.stop()
      setSection(SECTION.done)
      return
    }
  }

  // Auto-advance section when timer ends
  useEffect(() => {
    if (section === SECTION.intro || section === SECTION.done) return
    if (timer.secondsLeft !== 0) return
    goNext() // finish current question and section flow
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timer.secondsLeft])

  const results = useMemo(() => {
    if (section !== SECTION.done) return null

    const listeningCorrect = listeningItems.reduce((s, q, i) => {
      const a = ansListening[i]
      if (a == null) return s
      if (q.type === 'true_false') return s + (Boolean(a) === Boolean(q.answer) ? 1 : 0)
      return s + (Number(a) === Number(q.answer) ? 1 : 0)
    }, 0)

    const readingCorrect = readingItems.reduce((s, q, i) => {
      const a = ansReading[i]
      if (a == null) return s
      return s + (Number(a) === Number(q.answer) ? 1 : 0)
    }, 0)

    const writingCorrect = writingItems.reduce((s, q, i) => {
      const a = ansWriting[i]
      if (a == null) return s
      if (q.type === 'word_order') return s + (String(a) === String(q.answer) ? 1 : 0)
      if (q.type === 'write_character') return s + (String(a).trim() === String(q.answer).trim() ? 1 : 0)
      return s
    }, 0)

    return {
      date: todayISO(),
      listening: pct(listeningCorrect, listeningItems.length),
      reading: pct(readingCorrect, readingItems.length),
      writing: pct(writingCorrect, writingItems.length),
      raw: {
        listeningCorrect,
        readingCorrect,
        writingCorrect,
        listeningTotal: listeningItems.length,
        readingTotal: readingItems.length,
        writingTotal: writingItems.length,
      },
    }
  }, [ansListening, ansReading, ansWriting, listeningItems, readingItems, section, writingItems])

  useEffect(() => {
    if (section !== SECTION.done) return
    if (!results) return
    addExamResult({ date: results.date, listening: results.listening, reading: results.reading, writing: results.writing })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section])

  return (
    <div className={styles.wrap}>
      <div className={styles.row}>
        <div>
          <div className={styles.title}>Полный тест (Mock Exam)</div>
          <div className={styles.meta}>Секции идут подряд. Вернуться к предыдущей секции нельзя.</div>
        </div>
      </div>

      {section === SECTION.intro ? (
        <Card className={styles.card}>
          <div className={styles.block}>
            <div className={styles.badgeRow}>
              <span className={styles.badge}>Аудирование: 40</span>
              <span className={styles.badge}>Чтение: 30</span>
              <span className={styles.badge}>Письмо: 10</span>
            </div>
            <div className={styles.hiddenText}>
              Во время аудирования текст скрыт до ответа. Таймеры: 35 / 30 / 15 минут. Если время секции закончится,
              приложение автоматически перейдёт дальше.
            </div>
            <div className={styles.nav}>
              <Button type="button" variant="primary" onClick={startExam}>
                Начать экзамен
              </Button>
            </div>
          </div>
        </Card>
      ) : null}

      {section !== SECTION.intro && section !== SECTION.done ? (
        <Card className={styles.card}>
          <div className={styles.row}>
            <div className={styles.badgeRow}>
              <span className={styles.badge}>
                Секция:{' '}
                {section === SECTION.listening ? 'Аудирование' : section === SECTION.reading ? 'Чтение' : 'Письмо'}
              </span>
              <span className={styles.badgeSoft}>
                Вопрос {idx + 1} / {totalInSection}
              </span>
            </div>
            <div className={styles.timer}>⏱ {timer.mmss}</div>
          </div>

          <div className={styles.progressBar} aria-label="Прогресс секции">
            <div className={styles.progressFill} style={{ width: `${progressPercent}%` }} />
          </div>

          {section === SECTION.listening ? (
            <ListeningQuestion
              q={current}
              a={ansListening[idx]}
              onAnswer={setAnswer}
              onNext={goNext}
              onSpeak={speakListening}
              ttsAvailable={ttsAvailable}
            />
          ) : null}

          {section === SECTION.reading ? (
            <ReadingQuestion q={current} a={ansReading[idx]} onAnswer={setAnswer} onNext={goNext} />
          ) : null}

          {section === SECTION.writing ? (
            <WritingQuestion q={current} a={ansWriting[idx]} onAnswer={setAnswer} onNext={goNext} />
          ) : null}
        </Card>
      ) : null}

      {section === SECTION.done && results ? (
        <Card className={styles.card}>
          <div className={styles.results}>
            <div className={styles.badgeRow}>
              <span className={styles.badge}>Результат сохранён: {results.date}</span>
            </div>

            <div className={styles.resultGrid}>
              <div className={styles.resultCard}>
                <div className={styles.resultTitle}>Аудирование</div>
                <div className={styles.resultValue}>{results.listening}%</div>
                <div className={styles.resultSub}>
                  {results.raw.listeningCorrect}/{results.raw.listeningTotal}
                </div>
              </div>
              <div className={styles.resultCard}>
                <div className={styles.resultTitle}>Чтение</div>
                <div className={styles.resultValue}>{results.reading}%</div>
                <div className={styles.resultSub}>
                  {results.raw.readingCorrect}/{results.raw.readingTotal}
                </div>
              </div>
              <div className={styles.resultCard}>
                <div className={styles.resultTitle}>Письмо</div>
                <div className={styles.resultValue}>{results.writing}%</div>
                <div className={styles.resultSub}>
                  {results.raw.writingCorrect}/{results.raw.writingTotal}
                </div>
              </div>
            </div>

            <div className={styles.nav}>
              <Button
                type="button"
                variant="primary"
                onClick={() => {
                  setSection(SECTION.intro)
                  setIdx(0)
                }}
              >
                Пройти ещё раз
              </Button>
            </div>

            <div className={styles.review}>
              <div className={styles.badgeRow}>
                <span className={styles.badge}>Разбор ошибок</span>
              </div>
              <ReviewList
                listeningItems={listeningItems}
                readingItems={readingItems}
                writingItems={writingItems}
                ansListening={ansListening}
                ansReading={ansReading}
                ansWriting={ansWriting}
              />
            </div>
          </div>
        </Card>
      ) : null}
    </div>
  )
}

function ListeningQuestion({ q, a, onAnswer, onNext, onSpeak, ttsAvailable }) {
  if (!q) return null
  const answered = a != null
  const correctLabel =
    q.type === 'true_false'
      ? q.answer
        ? '对 / Верно'
        : '错 / Неверно'
      : `${String.fromCharCode(65 + Number(q.answer))}. ${q.options_zh?.[Number(q.answer)] ?? ''}`

  return (
    <div className={styles.block}>
      <div className={styles.row}>
        <div className={styles.badgeRow}>
          <span className={styles.badgeSoft}>Текст скрыт до ответа</span>
        </div>
        <div className={styles.badgeRow}>
          <TTSButton onSpeak={onSpeak} disabled={!ttsAvailable} title="Прослушать" />
        </div>
      </div>

      {q.type === 'true_false' ? (
        <>
          <div className={styles.prompt}>{q.statement_zh}</div>
          <div className={styles.subRu}>{q.statement_ru}</div>
          <div className={styles.options}>
            <Option
              prefix="A."
              zh="对"
              ru="Верно"
              selected={a === true}
              disabled={answered}
              onClick={() => onAnswer(true)}
            />
            <Option
              prefix="B."
              zh="错"
              ru="Неверно"
              selected={a === false}
              disabled={answered}
              onClick={() => onAnswer(false)}
            />
          </div>
        </>
      ) : (
        <>
          <div className={styles.prompt}>{q.question_zh}</div>
          <div className={styles.subRu}>{q.question_ru}</div>
          <div className={styles.options}>
            {q.options_zh.map((zh, i) => (
              <Option
                key={i}
                prefix={`${String.fromCharCode(65 + i)}.`}
                zh={zh}
                ru={q.options_ru?.[i]}
                selected={Number(a) === i}
                disabled={answered}
                onClick={() => onAnswer(i)}
              />
            ))}
          </div>
        </>
      )}

      {!answered ? <div className={styles.hiddenText}>После выбора ответа появится текст задания.</div> : null}

      {answered ? (
        <div className={styles.reveal}>
          <div>
            Правильный ответ: <b>{correctLabel}</b>
          </div>
          {q.type === 'true_false' ? (
            <>
              <div className={styles.prompt}>{q.text_zh}</div>
              <pre className={styles.pinyin}>{q.text_pinyin}</pre>
            </>
          ) : q.type === 'picture_description' ? (
            <>
              <div className={styles.prompt}>{q.description_zh}</div>
              <pre className={styles.pinyin}>{q.description_pinyin}</pre>
            </>
          ) : (
            <>
              <pre className={styles.dialogue}>{q.dialogue_zh}</pre>
              <pre className={styles.pinyin}>{q.dialogue_pinyin}</pre>
            </>
          )}
        </div>
      ) : null}

      <div className={styles.nav}>
        <span className={styles.meta}>Назад недоступен в режиме экзамена.</span>
        <Button type="button" variant="primary" onClick={onNext} disabled={!answered}>
          Далее
        </Button>
      </div>
    </div>
  )
}

function ReadingQuestion({ q, a, onAnswer, onNext }) {
  if (!q) return null
  const answered = a != null
  return (
    <div className={styles.block}>
      {q.type === 'reading_comprehension' ? <div className={styles.textBox}>{q.text_zh}</div> : null}
      <div className={styles.prompt}>
        {q.type === 'match_response' ? q.statement : q.type === 'insert_sentence' ? q.text_with_blank : q.question_zh}
      </div>

      <div className={styles.options}>
        {(q.type === 'reading_comprehension' ? q.options_zh : q.options).map((opt, i) => (
          <Option
            key={i}
            prefix={`${String.fromCharCode(65 + i)}.`}
            zh={opt}
            ru={q.type === 'reading_comprehension' ? q.options_ru?.[i] : null}
            selected={Number(a) === i}
            disabled={answered}
            onClick={() => onAnswer(i)}
          />
        ))}
      </div>

      {answered ? (
        <div className={styles.reveal}>
          <div>
            Правильный ответ: <b>{`${String.fromCharCode(65 + Number(q.answer))}.`}</b>
          </div>
          {q.explanation_ru ? <div className={styles.subRu}>{q.explanation_ru}</div> : null}
        </div>
      ) : null}

      <div className={styles.nav}>
        <span className={styles.meta}>Назад недоступен в режиме экзамена.</span>
        <Button type="button" variant="primary" onClick={onNext} disabled={!answered}>
          Далее
        </Button>
      </div>
    </div>
  )
}

function WritingQuestion({ q, a, onAnswer, onNext }) {
  if (!q) return null
  if (q.type === 'word_order') return <WritingWordOrderQuestion q={q} a={a} onAnswer={onAnswer} onNext={onNext} />
  return <WritingCharQuestion q={q} a={a} onAnswer={onAnswer} onNext={onNext} />
}

function WritingWordOrderQuestion({ q, a, onAnswer, onNext }) {
  const [picked, setPicked] = useState([])
  const [remaining, setRemaining] = useState(() => q.words ?? [])

  const answered = a != null
  const sentence = picked.join('') + (picked.length ? '。' : '')

  function pickWord(w, i) {
    if (answered) return
    setPicked((p) => [...p, w])
    setRemaining((r) => r.filter((_, idx) => idx !== i))
  }

  function undoWord(w, i) {
    if (answered) return
    setRemaining((r) => [w, ...r])
    setPicked((p) => p.filter((_, idx) => idx !== i))
  }

  function submit() {
    if (answered) return
    const final = picked.join('') + '。'
    onAnswer(final)
  }

  return (
    <div className={styles.block}>
      <div className={styles.subRu}>{q.translation}</div>
      <div className={styles.reveal}>
        <div className={styles.prompt}>{picked.length ? picked.join('') : 'Соберите предложение'}</div>
        {picked.length ? <div className={styles.subRu}>Ваш ответ: {sentence}</div> : null}
      </div>

      <div className={styles.options}>
        {picked.map((w, i) => (
          <button
            key={`${w}-${i}`}
            type="button"
            className={`${styles.option} ${styles.selected}`}
            onClick={() => undoWord(w, i)}
          >
            <div className={styles.optMainRow}>
              <span className={styles.optZh}>{w}</span>
            </div>
            <div className={styles.optRu}>нажмите, чтобы убрать</div>
          </button>
        ))}
        {remaining.map((w, i) => (
          <button key={`${w}-${i}`} type="button" className={styles.option} onClick={() => pickWord(w, i)}>
            <div className={styles.optMainRow}>
              <span className={styles.optZh}>{w}</span>
            </div>
            <div className={styles.optRu}>нажмите, чтобы добавить</div>
          </button>
        ))}
      </div>

      {answered ? (
        <div className={styles.reveal}>
          <div>
            Правильный ответ: <b>{q.answer}</b>
          </div>
        </div>
      ) : null}

      <div className={styles.nav}>
        {!answered ? (
          <Button type="button" variant="primary" onClick={submit} disabled={picked.length === 0}>
            Сдать ответ
          </Button>
        ) : (
          <span className={styles.meta}>Назад недоступен в режиме экзамена.</span>
        )}
        <Button type="button" variant="primary" onClick={onNext} disabled={!answered}>
          Далее
        </Button>
      </div>
    </div>
  )
}

function WritingCharQuestion({ q, a, onAnswer, onNext }) {
  const answered = a != null && a !== ''
  const [val, setVal] = useState(() => (a == null ? '' : String(a)))

  function submit() {
    if (!val.trim()) return
    onAnswer(val.trim())
  }

  return (
    <div className={styles.block}>
      <div className={styles.prompt}>{q.sentence_with_pinyin}</div>
      <div className={styles.subRu}>
        Пиньинь пропуска: <b>{q.blank_pinyin}</b>
      </div>
      <div className={styles.inputRow}>
        <input
          className={styles.charInput}
          value={val}
          onChange={(e) => setVal(e.target.value)}
          disabled={a != null}
        />
        <Button type="button" variant="primary" onClick={submit} disabled={a != null || !val.trim()}>
          Сдать ответ
        </Button>
      </div>
      {a != null ? (
        <div className={styles.reveal}>
          <div>
            Правильный ответ: <b>{q.answer}</b>
          </div>
        </div>
      ) : null}
      <div className={styles.nav}>
        <span className={styles.meta}>Назад недоступен в режиме экзамена.</span>
        <Button type="button" variant="primary" onClick={onNext} disabled={!answered}>
          Далее
        </Button>
      </div>
    </div>
  )
}

function Option({ prefix, zh, ru, selected, disabled, onClick }) {
  const cls = [styles.option, selected ? styles.selected : ''].filter(Boolean).join(' ')
  return (
    <button type="button" className={cls} disabled={disabled} onClick={onClick}>
      <div className={styles.optMainRow}>
        <span className={styles.optPrefix}>{prefix}</span>
        <span className={styles.optZh}>{zh}</span>
      </div>
      {ru ? <div className={styles.optRu}>{ru}</div> : null}
    </button>
  )
}

function ReviewList({ listeningItems, readingItems, writingItems, ansListening, ansReading, ansWriting }) {
  const wrongListening = listeningItems
    .map((q, i) => ({ q, i, a: ansListening[i] }))
    .filter(({ q, a }) => {
      if (a == null) return true
      if (q.type === 'true_false') return Boolean(a) !== Boolean(q.answer)
      return Number(a) !== Number(q.answer)
    })
  const wrongReading = readingItems
    .map((q, i) => ({ q, i, a: ansReading[i] }))
    .filter(({ q, a }) => a == null || Number(a) !== Number(q.answer))
  const wrongWriting = writingItems
    .map((q, i) => ({ q, i, a: ansWriting[i] }))
    .filter(({ q, a }) => {
      if (a == null) return true
      if (q.type === 'word_order') return String(a) !== String(q.answer)
      return String(a).trim() !== String(q.answer).trim()
    })

  const all = [
    ...wrongListening.map((x) => ({ ...x, section: 'Аудирование' })),
    ...wrongReading.map((x) => ({ ...x, section: 'Чтение' })),
    ...wrongWriting.map((x) => ({ ...x, section: 'Письмо' })),
  ]

  if (all.length === 0) {
    return <div className={styles.hiddenText}>Ошибок нет — отлично.</div>
  }

  return (
    <>
      {all.slice(0, 40).map(({ section, q, a }, k) => (
        <div key={k} className={styles.reviewItem}>
          <div className={styles.reviewTop}>
            <span className={styles.badge}>{section}</span>
            <span className={styles.wrong}>ошибка</span>
          </div>
          <div className={styles.subRu}>Ваш ответ: {a == null ? '—' : String(a)}</div>
          <div className={styles.subRu}>Правильный ответ: {q.type === 'true_false' ? String(q.answer) : String(q.answer)}</div>
          {section === 'Чтение' && q.explanation_ru ? <div className={styles.subRu}>{q.explanation_ru}</div> : null}
          {section === 'Письмо' && q.type === 'word_order' ? <div className={styles.prompt}>{q.answer}</div> : null}
        </div>
      ))}
      {all.length > 40 ? <div className={styles.hiddenText}>Показаны первые 40 ошибок из {all.length}.</div> : null}
    </>
  )
}

