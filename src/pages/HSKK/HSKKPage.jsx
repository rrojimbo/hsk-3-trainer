import { useMemo, useState } from 'react'
import hskk from '../../data/official-hskk-elementary.json'
import { Card } from '../../components/shared/Card'
import { Button } from '../../components/shared/Button'
import styles from './HSKKPage.module.css'

const mediaBase = (import.meta.env.VITE_MEDIA_BASE_URL ?? '').replace(/\/$/, '')

function withMediaBase(url) {
  if (!url) return null
  if (!mediaBase) return url
  if (/^https?:\/\//i.test(url)) return url
  if (url.startsWith('/')) return `${mediaBase}${url}`
  return `${mediaBase}/${url}`
}

export function HSKKPage() {
  const items = hskk.items ?? []
  const [selected, setSelected] = useState(() => items[0]?.code ?? '')

  const cur = useMemo(() => items.find((x) => x.code === selected) ?? items[0] ?? null, [items, selected])
  const audioList = cur?.audio ?? []
  const pdf = withMediaBase(cur?.pdf_main ?? null)
  const transcript = withMediaBase(cur?.pdf_transcript ?? null)
  const resolvedAudioList = audioList.map((a) => withMediaBase(a)).filter(Boolean)

  return (
    <div className={styles.layout}>
      <Card className={styles.sidebar}>
        <div className={styles.sideTitle}>HSKK (Elementary)</div>
        <div className={styles.sideMeta}>Тесты по говорению (PDF + аудио).</div>
        <div className={styles.list}>
          {items.map((t) => (
            <button
              key={t.code}
              type="button"
              className={[styles.item, t.code === selected ? styles.itemActive : ''].filter(Boolean).join(' ')}
              onClick={() => setSelected(t.code)}
            >
              <span className={styles.code}>{t.code}</span>
              <span className={styles.files}>{t.files_count} файлов</span>
            </button>
          ))}
        </div>
      </Card>

      <div className={styles.content}>
        <Card className={styles.topCard}>
          <div className={styles.row}>
            <div>
              <div className={styles.title}>{cur?.code ?? '—'}</div>
              <div className={styles.meta}>
                Можно слушать оригинальное аудио и открывать задания в PDF. Следующим шагом добавлю запись ответа прямо
                в браузере.
              </div>
            </div>
            <div className={styles.links}>
              {pdf ? (
                <Button as="a" href={pdf} target="_blank" rel="noreferrer" variant="ghost">
                  Открыть PDF
                </Button>
              ) : null}
              {transcript ? (
                <Button as="a" href={transcript} target="_blank" rel="noreferrer" variant="ghost">
                  Транскрипт
                </Button>
              ) : null}
            </div>
          </div>

          {resolvedAudioList.length ? (
            <div className={styles.audioBlock}>
              <div className={styles.audioTitle}>Аудио</div>
              {resolvedAudioList.map((a) => (
                <div key={a} className={styles.audioRow}>
                  <audio controls preload="none" src={a} className={styles.audio} />
                  <a className={styles.dl} href={a} download>
                    скачать
                  </a>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.meta}>Аудио не найдено для этого теста.</div>
          )}
        </Card>

        {pdf ? (
          <Card className={styles.viewer}>
            <iframe className={styles.iframe} title={`PDF ${cur?.code ?? ''}`} src={pdf} />
          </Card>
        ) : (
          <Card className={styles.viewer}>
            <div className={styles.meta}>PDF не найден.</div>
          </Card>
        )}
      </div>
    </div>
  )
}

