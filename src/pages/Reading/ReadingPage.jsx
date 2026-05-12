import { useEffect, useMemo, useState } from 'react'
import data from '../../data/reading.json'
import { Card } from '../../components/shared/Card'
import { Button } from '../../components/shared/Button'
import { useProgress } from '../../hooks/useProgress'
import { useTimer } from '../../hooks/useTimer'
import styles from './ReadingPage.module.css'

const TYPES = [
  { id: 'all', label: 'Все' },
  { id: 'match_response', label: 'Подбери ответ' },
  { id: 'insert_sentence', label: 'Вставь слово/фразу' },
  { id: 'reading_comprehension', label: 'Понимание текста' },
]

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function ReadingPage() {
  const { ensureTodaySession } = useProgress()
  const [type, setType] = useState('all')
  const [order, setOrder] = useState('shuffle')
  const [timerOn, setTimerOn] = useState(false)
  const [perQuestionSec, setPerQuestionSec] = useState(90)
  const timer = useTimer({ initialSeconds: perQuestionSec, autoStart: false })

  const [idx, setIdx] = useState(0)
  const [picked, setPicked] = useState(null) // null | { value, ok }

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
  }, [type, order])

  useEffect(() => {
    setPicked(null)
    if (timerOn) {
      timer.reset(perQuestionSec)
      timer.start()
    } else {
      timer.stop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, timerOn, perQuestionSec])

  useEffect(() => {
    if (!timerOn) return
    if (timer.secondsLeft !== 0) return
    if (!current) return
    if (picked) return
    // Авто-сдача: считаем неверным, если время вышло
    setPicked({ value: null, ok: false, timeout: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timer.secondsLeft, timerOn])

  function next() {
    setPicked(null)
    setIdx((i) => (i + 1 >= list.length ? 0 : i + 1))
  }

  function prev() {
    setPicked(null)
    setIdx((i) => (i - 1 < 0 ? Math.max(0, list.length - 1) : i - 1))
  }

  function answer(i) {
    if (!current || picked) return
    const ok = Number(i) === Number(current.answer)
    setPicked({ value: i, ok })
    if (timerOn) timer.stop()
  }

  const title =
    current?.type === 'match_response'
      ? 'Подбери ответ'
      : current?.type === 'insert_sentence'
        ? 'Вставь слово/фразу'
        : current?.type === 'reading_comprehension'
          ? 'Понимание текста'
          : ''

  return (
    <div className={styles.wrap}>
      <div className={styles.top}>
        <div className={styles.titleRow}>
          <div className={styles.title}>Чтение</div>
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
              Таймер
              <div className={styles.toggleRow}>
                <input type="checkbox" checked={timerOn} onChange={(e) => setTimerOn(e.target.checked)} />
                <span className={styles.toggleHint}>на вопрос</span>
              </div>
            </label>

            <label className={styles.label}>
              Время (сек)
              <input
                className={styles.input}
                type="number"
                min={20}
                max={600}
                value={perQuestionSec}
                onChange={(e) => setPerQuestionSec(Number(e.target.value))}
                disabled={!timerOn}
              />
              {timerOn ? <div className={styles.timerBadge}>Осталось: {timer.mmss}</div> : null}
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
                {timerOn ? <span className={styles.badgeSoft}>таймер включён</span> : null}
              </div>
            </div>

            {current.type === 'match_response' ? (
              <div className={styles.block}>
                <div className={styles.prompt}>{current.statement}</div>
                <div className={styles.options}>
                  {current.options.map((opt, i) => (
                    <OptionButton
                      key={i}
                      prefix={`${String.fromCharCode(65 + i)}.`}
                      main={opt}
                      chosen={picked?.value === i}
                      ok={picked ? Number(current.answer) === i : null}
                      bad={picked ? picked.value === i && !picked.ok : null}
                      disabled={Boolean(picked)}
                      onClick={() => answer(i)}
                    />
                  ))}
                </div>
              </div>
            ) : null}

            {current.type === 'insert_sentence' ? (
              <div className={styles.block}>
                <div className={styles.prompt}>{current.text_with_blank}</div>
                <div className={styles.options}>
                  {current.options.map((opt, i) => (
                    <OptionButton
                      key={i}
                      prefix={`${String.fromCharCode(65 + i)}.`}
                      main={opt}
                      chosen={picked?.value === i}
                      ok={picked ? Number(current.answer) === i : null}
                      bad={picked ? picked.value === i && !picked.ok : null}
                      disabled={Boolean(picked)}
                      onClick={() => answer(i)}
                    />
                  ))}
                </div>
              </div>
            ) : null}

            {current.type === 'reading_comprehension' ? (
              <div className={styles.block}>
                <div className={styles.textBox}>{current.text_zh}</div>
                <div className={styles.prompt}>{current.question_zh}</div>
                <div className={styles.options}>
                  {current.options_zh.map((zh, i) => (
                    <OptionButton
                      key={i}
                      prefix={`${String.fromCharCode(65 + i)}.`}
                      main={zh}
                      sub={current.options_ru?.[i]}
                      chosen={picked?.value === i}
                      ok={picked ? Number(current.answer) === i : null}
                      bad={picked ? picked.value === i && !picked.ok : null}
                      disabled={Boolean(picked)}
                      onClick={() => answer(i)}
                    />
                  ))}
                </div>
              </div>
            ) : null}

            {picked ? (
              <div className={picked.ok ? styles.feedbackOk : styles.feedbackBad}>
                {picked.timeout ? 'Время вышло.' : picked.ok ? 'Правильно.' : 'Неправильно.'}
                <div className={styles.feedbackMeta}>
                  Правильный ответ:{' '}
                  <b>{`${String.fromCharCode(65 + Number(current.answer))}.`}</b>
                </div>
                {current.explanation_ru ? <div className={styles.expl}>{current.explanation_ru}</div> : null}
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

function OptionButton({ prefix, main, sub, chosen, ok, bad, disabled, onClick }) {
  const cls = [styles.option, chosen ? styles.optionChosen : '', ok ? styles.optionOk : '', bad ? styles.optionBad : '']
    .filter(Boolean)
    .join(' ')
  return (
    <button type="button" className={cls} disabled={disabled} onClick={onClick}>
      <div className={styles.optMainRow}>
        <span className={styles.optPrefix}>{prefix}</span>
        <span className={styles.optMain}>{main}</span>
      </div>
      {sub ? <div className={styles.optSub}>{sub}</div> : null}
    </button>
  )
}

