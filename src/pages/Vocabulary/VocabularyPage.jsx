import { useEffect, useMemo, useState } from 'react'
import wordsData from '../../data/words.json'
import { Card } from '../../components/shared/Card'
import { Button } from '../../components/shared/Button'
import { TTSButton } from '../../components/shared/TTSButton'
import { useProgress } from '../../hooks/useProgress'
import { useTTS } from '../../hooks/useTTS'
import { useSpacedRepQueue, nextWordAfterAnswer } from '../../hooks/useSpacedRep'
import { isPinyinMatch, normalizePinyin } from '../../utils/pinyin'
import styles from './VocabularyPage.module.css'

const MODES = [
  { id: 'cards', label: 'Флипкарты' },
  { id: 'quiz', label: 'Тест (перевод)' },
  { id: 'pinyin', label: 'Пиньинь' },
]

const ONLY = [
  { id: 'all', label: 'Все' },
  { id: 'learning', label: 'Изучаемые' },
  { id: 'new', label: 'Новые' },
  { id: 'known', label: 'Выученные' },
  { id: 'problem', label: 'Проблемные' },
]

function uniq(arr) {
  return Array.from(new Set(arr))
}

function choice(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

export function VocabularyPage() {
  const { wordsProgress, setWordProgress, settings, setSettings, ensureTodaySession } = useProgress()
  const { available: ttsAvailable, speak } = useTTS()

  const [mode, setMode] = useState('cards')
  const [level, setLevel] = useState('all')
  const [topic, setTopic] = useState('all')
  const [only, setOnly] = useState('all')
  const [cardRevealed, setCardRevealed] = useState(false)
  const [idx, setIdx] = useState(0)

  // Quiz mode state
  const [quizOptions, setQuizOptions] = useState([])
  const [quizPicked, setQuizPicked] = useState(null)

  // Pinyin mode state
  const [pinyinInput, setPinyinInput] = useState('')
  const [pinyinChecked, setPinyinChecked] = useState(null) // null | { ok, expected }

  useEffect(() => {
    ensureTodaySession()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const topics = useMemo(() => ['all', ...uniq(wordsData.map((w) => w.topic).filter(Boolean))], [])

  const filteredWords = useMemo(() => {
    return wordsData.filter((w) => {
      if (level !== 'all' && String(w.hsk_level) !== String(level)) return false
      if (topic !== 'all' && w.topic !== topic) return false
      return true
    })
  }, [level, topic])

  const queue = useSpacedRepQueue(filteredWords, wordsProgress, { only })
  const current = queue[idx] ?? queue[0] ?? null
  const word = current?.word ?? null
  const progress = current?.progress ?? null

  const knownCount = useMemo(
    () => wordsData.filter((w) => (wordsProgress?.[String(w.id)]?.status ?? 'new') === 'known').length,
    [wordsProgress],
  )

  useEffect(() => {
    setIdx(0)
    setCardRevealed(false)
    setQuizPicked(null)
    setPinyinInput('')
    setPinyinChecked(null)
  }, [mode, level, topic, only])

  useEffect(() => {
    if (!word) return
    if (mode !== 'quiz') return

    const pool = filteredWords.filter((w) => w.id !== word.id && w.translation)
    const opts = [word]
    while (opts.length < 4 && pool.length > 0) {
      const w = choice(pool)
      if (!opts.some((x) => x.id === w.id)) opts.push(w)
    }
    setQuizOptions(opts.sort(() => Math.random() - 0.5))
    setQuizPicked(null)
  }, [filteredWords, mode, word])

  function speakWord() {
    if (!word) return
    speak(word.hanzi, { lang: 'zh-CN', rate: 1.0 })
  }

  function speakExample() {
    if (!word?.example_zh) return
    speak(word.example_zh, { lang: 'zh-CN', rate: 1.0 })
  }

  function goNext() {
    setCardRevealed(false)
    setQuizPicked(null)
    setPinyinInput('')
    setPinyinChecked(null)
    setIdx((i) => (i + 1 >= queue.length ? 0 : i + 1))
  }

  function markKnown() {
    if (!word) return
    setWordProgress(word.id, { status: 'known', correctStreak: 3, lastSeen: Date.now() })
    goNext()
  }

  function markLearningWrong() {
    if (!word) return
    const next = nextWordAfterAnswer(current, false)
    setWordProgress(word.id, { ...next, lastSeen: Date.now() })
    goNext()
  }

  function markHard() {
    if (!word) return
    setWordProgress(word.id, { status: 'hard', correctStreak: 0, lastSeen: Date.now() })
    goNext()
  }

  function handleQuizPick(optIdx) {
    if (!word) return
    if (quizPicked != null) return
    const picked = quizOptions[optIdx]
    const ok = picked?.id === word.id
    setQuizPicked({ optIdx, ok })
    const next = nextWordAfterAnswer(current, ok)
    setWordProgress(word.id, { ...next, lastSeen: Date.now() })
  }

  function handlePinyinCheck() {
    if (!word) return
    if (pinyinChecked) return
    const ok = isPinyinMatch(pinyinInput, word.pinyin)
    setPinyinChecked({ ok, expected: word.pinyin })
    const next = nextWordAfterAnswer(current, ok)
    setWordProgress(word.id, { ...next, lastSeen: Date.now() })
  }

  const pinyinPosition = settings?.pinyinPosition ?? 'below'
  const togglePinyinPosition = () =>
    setSettings({ ...(settings ?? {}), pinyinPosition: pinyinPosition === 'below' ? 'above' : 'below' })

  return (
    <div className={styles.wrap}>
      <div className={styles.top}>
        <div className={styles.titleRow}>
          <div className={styles.title}>Слова</div>
          <div className={styles.meta}>
            Выучено: <b>{knownCount}</b> из <b>{wordsData.length}</b>
          </div>
        </div>

        <Card className={styles.filters}>
          <div className={styles.row}>
            <label className={styles.label}>
              Уровень
              <select className={styles.select} value={level} onChange={(e) => setLevel(e.target.value)}>
                <option value="all">Все</option>
                <option value="1">HSK 1</option>
                <option value="2">HSK 2</option>
                <option value="3">HSK 3</option>
              </select>
            </label>

            <label className={styles.label}>
              Тема
              <select className={styles.select} value={topic} onChange={(e) => setTopic(e.target.value)}>
                {topics.map((t) => (
                  <option key={t} value={t}>
                    {t === 'all' ? 'Все' : t}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.label}>
              Сессия
              <select className={styles.select} value={only} onChange={(e) => setOnly(e.target.value)}>
                {ONLY.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.label}>
              Пиньинь
              <Button type="button" variant="ghost" size="sm" onClick={togglePinyinPosition}>
                {pinyinPosition === 'below' ? 'снизу' : 'сверху'}
              </Button>
            </label>
          </div>

          <div className={styles.modeRow}>
            {MODES.map((m) => (
              <Button
                key={m.id}
                type="button"
                variant={mode === m.id ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setMode(m.id)}
              >
                {m.label}
              </Button>
            ))}
          </div>
        </Card>
      </div>

      <Card className={styles.session}>
        {!word ? (
          <div className={styles.empty}>
            Нет слов для выбранных фильтров.
            <div className={styles.emptyHint}>Попробуйте «Все» или сменить уровень/тему.</div>
          </div>
        ) : (
          <>
            <div className={styles.sessionTop}>
              <div className={styles.badges}>
                <span className={styles.badge}>HSK {word.hsk_level}</span>
                <span className={styles.badge}>{word.topic}</span>
                <span className={styles.badgeSoft}>
                  статус: <b>{progress?.status ?? 'new'}</b>
                </span>
              </div>

              <div className={styles.tts}>
                <TTSButton onSpeak={speakWord} disabled={!ttsAvailable} />
              </div>
            </div>

            {mode === 'cards' ? (
              <div className={styles.cardMode}>
                <button type="button" className={styles.cardFace} onClick={() => setCardRevealed((v) => !v)}>
                  {pinyinPosition === 'above' ? <div className="pinyin">{word.pinyin}</div> : null}
                  <div className={`hanzi ${styles.hanzi}`}>{word.hanzi}</div>
                  {pinyinPosition === 'below' ? <div className="pinyin">{word.pinyin}</div> : null}
                  <div className={styles.tapHint}>{cardRevealed ? 'нажмите, чтобы скрыть' : 'нажмите, чтобы открыть'}</div>
                </button>

                {cardRevealed ? (
                  <div className={styles.reveal}>
                    <div className={styles.translation}>{word.translation || '—'}</div>
                    {Array.isArray(word.classifiers) && word.classifiers.length > 0 ? (
                      <div className={styles.classifiers}>
                        Счётные слова: <b>{word.classifiers.join(', ')}</b>
                      </div>
                    ) : null}
                    {word.example_zh ? (
                      <div className={styles.example}>
                        <div className={styles.exampleRow}>
                          <div className={styles.exampleZh}>{word.example_zh}</div>
                          <TTSButton onSpeak={speakExample} disabled={!ttsAvailable} />
                        </div>
                        {word.example_pinyin ? <div className="pinyin">{word.example_pinyin}</div> : null}
                        {word.example_ru ? <div className={styles.exampleRu}>{word.example_ru}</div> : null}
                      </div>
                    ) : (
                      <div className={styles.exampleEmpty}>Пример пока не задан в данных.</div>
                    )}
                  </div>
                ) : null}

                <div className={styles.actions}>
                  <Button type="button" variant="good" onClick={markKnown}>
                    Знаю
                  </Button>
                  <Button type="button" variant="bad" onClick={markLearningWrong}>
                    Не знаю
                  </Button>
                  <Button type="button" variant="ghost" onClick={markHard}>
                    Сложное
                  </Button>
                  <Button type="button" variant="ghost" onClick={goNext}>
                    Далее
                  </Button>
                </div>
              </div>
            ) : null}

            {mode === 'quiz' ? (
              <div className={styles.quizMode}>
                <div className={styles.prompt}>
                  {pinyinPosition === 'above' ? <div className="pinyin">{word.pinyin}</div> : null}
                  <div className={`hanzi ${styles.hanzi}`}>{word.hanzi}</div>
                  {pinyinPosition === 'below' ? <div className="pinyin">{word.pinyin}</div> : null}
                  <div className={styles.promptSub}>Выберите правильный перевод</div>
                </div>

                <div className={styles.options}>
                  {quizOptions.map((o, i) => {
                    const picked = quizPicked?.optIdx === i
                    const ok = quizPicked && o.id === word.id
                    const bad = quizPicked && picked && !quizPicked.ok
                    return (
                      <button
                        key={o.id}
                        type="button"
                        className={[
                          styles.option,
                          quizPicked ? styles.optionLocked : '',
                          ok ? styles.optionOk : '',
                          bad ? styles.optionBad : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        onClick={() => handleQuizPick(i)}
                        disabled={quizPicked != null}
                      >
                        {o.translation || '—'}
                      </button>
                    )
                  })}
                </div>

                <div className={styles.actions}>
                  <Button type="button" variant="ghost" onClick={markHard}>
                    Сложное
                  </Button>
                  <Button type="button" variant="primary" onClick={goNext} disabled={quizPicked == null}>
                    Далее
                  </Button>
                </div>
              </div>
            ) : null}

            {mode === 'pinyin' ? (
              <div className={styles.pinyinMode}>
                <div className={styles.prompt}>
                  <div className={`hanzi ${styles.hanzi}`}>{word.hanzi}</div>
                  <div className={styles.promptSub}>Введите пиньинь</div>
                </div>

                <div className={styles.pinyinRow}>
                  <input
                    className={styles.pinyinInput}
                    value={pinyinInput}
                    onChange={(e) => setPinyinInput(e.target.value)}
                    placeholder="например: yīnwèi"
                    inputMode="text"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    disabled={pinyinChecked != null}
                  />
                  <Button type="button" variant="primary" onClick={handlePinyinCheck} disabled={!pinyinInput.trim() || pinyinChecked != null}>
                    Проверить
                  </Button>
                </div>

                {pinyinChecked ? (
                  <div className={pinyinChecked.ok ? styles.feedbackOk : styles.feedbackBad}>
                    {pinyinChecked.ok ? (
                      <>Правильно.</>
                    ) : (
                      <>
                        Неправильно. Правильный пиньинь: <b>{pinyinChecked.expected}</b>
                      </>
                    )}
                    <div className={styles.feedbackMeta}>
                      Ваш ответ: <code className={styles.code}>{normalizePinyin(pinyinInput) || '—'}</code>
                    </div>
                  </div>
                ) : null}

                <div className={styles.actions}>
                  <Button type="button" variant="ghost" onClick={markHard}>
                    Сложное
                  </Button>
                  <Button type="button" variant="primary" onClick={goNext} disabled={!pinyinChecked}>
                    Далее
                  </Button>
                </div>
              </div>
            ) : null}
          </>
        )}
      </Card>
    </div>
  )
}

