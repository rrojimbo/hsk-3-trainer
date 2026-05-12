import { useEffect, useMemo, useState } from 'react'
import data from '../../data/listening.json'
import { Card } from '../../components/shared/Card'
import { Button } from '../../components/shared/Button'
import { TTSButton } from '../../components/shared/TTSButton'
import { useProgress } from '../../hooks/useProgress'
import { useTTS } from '../../hooks/useTTS'
import styles from './ListeningPage.module.css'

const TYPES = [
  { id: 'all', label: 'Все' },
  { id: 'true_false', label: 'Верно/Неверно' },
  { id: 'picture_description', label: 'Описание картинки' },
  { id: 'dialogue_question', label: 'Диалог + вопрос' },
]

const RATES = [
  { id: 0.7, label: '0.7×' },
  { id: 1.0, label: '1.0×' },
  { id: 1.2, label: '1.2×' },
]

export function ListeningPage() {
  return <ListeningPageImpl />
}

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function ListeningPageImpl() {
  const { ensureTodaySession } = useProgress()
  const { available: ttsAvailable, speak, cancel } = useTTS()

  const [type, setType] = useState('all')
  const [rate, setRate] = useState(1.0)
  const [x3, setX3] = useState(true)
  const [order, setOrder] = useState('shuffle') // shuffle | in_order

  const [idx, setIdx] = useState(0)
  const [picked, setPicked] = useState(null) // null | { value, ok }
  const [replaysAfter, setReplaysAfter] = useState(0)

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
    setPicked(null)
    setReplaysAfter(0)
    cancel()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, order])

  useEffect(() => {
    setPicked(null)
    setReplaysAfter(0)
    cancel()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx])

  function speakCurrent() {
    if (!current) return
    const text =
      current.type === 'true_false'
        ? current.text_zh
        : current.type === 'picture_description'
          ? current.description_zh
          : current.dialogue_zh
    speak(String(text).replaceAll('\n', ' '), { lang: 'zh-CN', rate })
  }

  function next() {
    setPicked(null)
    setReplaysAfter(0)
    setIdx((i) => (i + 1 >= list.length ? 0 : i + 1))
  }

  function prev() {
    setPicked(null)
    setReplaysAfter(0)
    setIdx((i) => (i - 1 < 0 ? Math.max(0, list.length - 1) : i - 1))
  }

  function answerTF(val) {
    if (!current || picked) return
    const ok = Boolean(val) === Boolean(current.answer)
    setPicked({ value: val, ok })
  }

  function answerOption(i) {
    if (!current || picked) return
    const ok = Number(i) === Number(current.answer)
    setPicked({ value: i, ok })
  }

  // x3: после разбора автоматически проигрываем ещё раз (до 2 доп.повторов)
  useEffect(() => {
    if (!picked) return
    if (!x3) return
    if (!ttsAvailable) return
    if (replaysAfter >= 2) return
    const t = setTimeout(() => {
      speakCurrent()
      setReplaysAfter((n) => n + 1)
    }, 900)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picked, x3, ttsAvailable])

  const title =
    current?.type === 'true_false'
      ? 'Верно / Неверно'
      : current?.type === 'picture_description'
        ? 'Описание картинки'
        : current?.type === 'dialogue_question'
          ? 'Диалог + вопрос'
          : ''

  return (
    <div className={styles.wrap}>
      <div className={styles.top}>
        <div className={styles.titleRow}>
          <div className={styles.title}>Аудирование</div>
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

            <label className={styles.label}>
              Скорость
              <div className={styles.rateRow}>
                {RATES.map((r) => (
                  <Button
                    key={r.id}
                    type="button"
                    size="sm"
                    variant={rate === r.id ? 'primary' : 'ghost'}
                    onClick={() => setRate(r.id)}
                  >
                    {r.label}
                  </Button>
                ))}
              </div>
            </label>

            <label className={styles.label}>
              Режим ×3
              <div className={styles.toggleRow}>
                <input type="checkbox" checked={x3} onChange={(e) => setX3(e.target.checked)} />
                <span className={styles.toggleHint}>после разбора озвучить ещё раз</span>
              </div>
            </label>
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
                <span className={styles.badgeSoft}>текст скрыт до ответа</span>
              </div>
              <div className={styles.tts}>
                <TTSButton onSpeak={speakCurrent} disabled={!ttsAvailable} title="Прослушать" />
                <Button type="button" size="sm" variant="ghost" onClick={cancel}>
                  Стоп
                </Button>
              </div>
            </div>

            <div className={styles.qBlock}>
              {current.type === 'true_false' ? (
                <>
                  <div className={styles.qTitle}>Утверждение</div>
                  <div className={styles.qZh}>{current.statement_zh}</div>
                  <div className={styles.qRu}>{current.statement_ru}</div>

                  <div className={styles.options}>
                    <OptionButton
                      mainZh="对"
                      subRu="Верно"
                      chosen={picked?.value === true}
                      ok={picked ? Boolean(current.answer) === true : null}
                      bad={picked ? picked.value === true && !picked.ok : null}
                      disabled={Boolean(picked)}
                      onClick={() => answerTF(true)}
                    />
                    <OptionButton
                      mainZh="错"
                      subRu="Неверно"
                      chosen={picked?.value === false}
                      ok={picked ? Boolean(current.answer) === false : null}
                      bad={picked ? picked.value === false && !picked.ok : null}
                      disabled={Boolean(picked)}
                      onClick={() => answerTF(false)}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className={styles.qTitle}>Вопрос</div>
                  <div className={styles.qZh}>{current.question_zh}</div>
                  <div className={styles.qRu}>{current.question_ru}</div>

                  <div className={styles.options}>
                    {current.options_zh.map((zh, i) => (
                      <OptionButton
                        key={i}
                        prefix={`${String.fromCharCode(65 + i)}.`}
                        mainZh={zh}
                        subRu={current.options_ru?.[i]}
                        chosen={picked?.value === i}
                        ok={picked ? Number(current.answer) === i : null}
                        bad={picked ? picked.value === i && !picked.ok : null}
                        disabled={Boolean(picked)}
                        onClick={() => answerOption(i)}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>

            {picked ? (
              <div className={picked.ok ? styles.feedbackOk : styles.feedbackBad}>
                {picked.ok ? 'Правильно.' : 'Неправильно.'}
                <div className={styles.feedbackMeta}>
                  Правильный ответ:{' '}
                  <b>
                    {current.type === 'true_false'
                      ? current.answer
                        ? 'Верно'
                        : 'Неверно'
                      : `${String.fromCharCode(65 + Number(current.answer))}. ${current.options_ru?.[Number(current.answer)] ?? ''}`}
                  </b>
                </div>
                <div className={styles.afterRow}>
                  <Button type="button" variant="ghost" size="sm" onClick={speakCurrent} disabled={!ttsAvailable}>
                    Прослушать ещё раз
                  </Button>
                  {x3 ? <span className={styles.afterHint}>автоповторы: {replaysAfter}/2</span> : null}
                </div>
              </div>
            ) : null}

            {picked ? (
              <div className={styles.textBlock}>
                <div className={styles.textTitle}>Текст</div>
                {current.type === 'true_false' ? (
                  <>
                    <div className={styles.textZh}>{current.text_zh}</div>
                    <div className="pinyin">{current.text_pinyin}</div>
                  </>
                ) : current.type === 'picture_description' ? (
                  <>
                    <div className={styles.textZh}>{current.description_zh}</div>
                    <div className="pinyin">{current.description_pinyin}</div>
                  </>
                ) : (
                  <>
                    <pre className={styles.dialogue}>{current.dialogue_zh}</pre>
                    <pre className={styles.dialoguePinyin}>{current.dialogue_pinyin}</pre>
                  </>
                )}
              </div>
            ) : null}

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

function OptionButton({ prefix, mainZh, subRu, chosen, ok, bad, disabled, onClick }) {
  const cls = [
    styles.option,
    chosen ? styles.optionChosen : '',
    ok ? styles.optionOk : '',
    bad ? styles.optionBad : '',
  ]
    .filter(Boolean)
    .join(' ')
  return (
    <button type="button" className={cls} disabled={disabled} onClick={onClick}>
      <div className={styles.optMainRow}>
        {prefix ? <span className={styles.optPrefix}>{prefix}</span> : null}
        <span className={styles.optZh}>{mainZh}</span>
      </div>
      {subRu ? <div className={styles.optSub}>{subRu}</div> : null}
    </button>
  )
}

