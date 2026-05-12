import fs from 'node:fs'
import path from 'node:path'

const RAW_PATH = path.resolve('scripts', 'hsk.raw.json')
const FALLBACK_HSK3_CSV_PATH = path.resolve('scripts', 'hsk3.fallback.csv')
const OUT_PATH = path.resolve('src', 'data', 'words.json')

/**
 * Простейшая классификация по теме — эвристика.
 * Не идеальна, но помогает фильтрам в приложении.
 */
function inferTopic({ hanzi, pinyin, ru }) {
  const s = `${hanzi} ${pinyin} ${ru}`.toLowerCase()

  const hasAny = (arr) => arr.some((x) => s.includes(x))

  if (hasAny(['потому', 'поэтому', 'если', 'то', 'хотя', 'но', 'или', 'либо'])) return 'союзы'
  if (hasAny(['время', 'сегодня', 'вчера', 'завтра', 'неделя', 'месяц', 'год', 'час', 'минута', 'утро', 'вечер', 'ночь', 'день'])) return 'время'
  if (hasAny(['уч', 'школ', 'универ', 'урок', 'студент', 'учител', 'экзамен', 'класс'])) return 'образование'
  if (hasAny(['работ', 'офис', 'началь', 'деньги', 'зарплат', 'компан'])) return 'работа'
  if (hasAny(['автобус', 'метро', 'поезд', 'самолет', 'такси', 'машин', 'дорог', 'станц', 'билет'])) return 'транспорт'
  if (hasAny(['бол', 'врач', 'лекар', 'больниц', 'температур', 'здоров', 'голов', 'живот'])) return 'здоровье'
  if (hasAny(['куп', 'магаз', 'цена', 'дешев', 'дорог', 'покуп', 'оплат', 'деньги'])) return 'покупки'
  if (hasAny(['дожд', 'снег', 'ветер', 'погод', 'река', 'гора', 'лес', 'море', 'небо', 'солнц'])) return 'природа'
  if (hasAny(['рад', 'груст', 'серд', 'злит', 'счаст', 'бо', 'люб', 'ненав'])) return 'эмоции'
  if (hasAny(['делать', 'идти', 'ехать', 'есть', 'пить', 'сказать', 'говор', 'читать', 'пис', 'смотр', 'учить'])) return 'действия'

  // Часто бытовая лексика: семья, еда, дом, повседневность
  return 'бытовое'
}

function pickRuTranslation(translations) {
  if (!translations || !translations.rus || !Array.isArray(translations.rus) || translations.rus.length === 0) return ''
  // Берём самое короткое/простое по ощущению (часто первое подходит)
  const sorted = [...translations.rus].sort((a, b) => a.length - b.length)
  return sorted[0]
}

function main() {
  if (!fs.existsSync(RAW_PATH)) {
    console.error(`Не найден файл: ${RAW_PATH}`)
    console.error('Сначала положите исходный датасет в scripts/hsk.raw.json')
    process.exit(1)
  }

  const raw = JSON.parse(fs.readFileSync(RAW_PATH, 'utf8'))
  const filtered = raw.filter((w) => Number(w.level) >= 1 && Number(w.level) <= 3)

  // HSK 1:150, HSK 2:150, HSK 3:300 (ровно 600)
  const byLevel = new Map()
  for (const w of filtered) {
    const lvl = Number(w.level)
    byLevel.set(lvl, [...(byLevel.get(lvl) ?? []), w])
  }

  const lvl1 = (byLevel.get(1) ?? []).slice(0, 150)
  const lvl2 = (byLevel.get(2) ?? []).slice(0, 150)
  let lvl3 = (byLevel.get(3) ?? []).slice(0, 300)

  // Некоторые источники HSK2.0 дают 299 слов на HSK3.
  // Для требований проекта добираем 1+ слово из запасного списка HSK3 (CSV).
  if (lvl3.length < 300 && fs.existsSync(FALLBACK_HSK3_CSV_PATH)) {
    const existing = new Set(lvl3.map((w) => w.hanzi))
    const csv = fs.readFileSync(FALLBACK_HSK3_CSV_PATH, 'utf8')
    const lines = csv.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
    for (const line of lines) {
      const [hanzi, pinyin, eng] = line.split(',')
      if (!hanzi || existing.has(hanzi)) continue
      lvl3 = [
        ...lvl3,
        {
          hanzi,
          level: 3,
          pinyin: (pinyin ?? '').replaceAll('u:', 'ü'),
          translations: { rus: [eng ?? ''] },
        },
      ]
      existing.add(hanzi)
      if (lvl3.length >= 300) break
    }
  }

  // Последний гарантированный добор (чтобы строго получить 300 "новых" слов HSK3).
  // Добавляем частотное слово HSK3, если его не было в источниках.
  if (lvl3.length < 300) {
    const existing = new Set(lvl3.map((w) => w.hanzi))
    const manual = [
      { hanzi: '例如', pinyin: 'lì rú', rus: 'например' },
      { hanzi: '一般', pinyin: 'yī bān', rus: 'обычно; в целом' },
      { hanzi: '环境', pinyin: 'huán jìng', rus: 'окружающая среда' },
    ]
    for (const m of manual) {
      if (existing.has(m.hanzi)) continue
      lvl3 = [
        ...lvl3,
        { hanzi: m.hanzi, level: 3, pinyin: m.pinyin, translations: { rus: [m.rus] } },
      ]
      existing.add(m.hanzi)
      if (lvl3.length >= 300) break
    }
  }
  const combined = [...lvl1, ...lvl2, ...lvl3]

  if (combined.length !== 600) {
    console.error(`Ожидалось 600 слов, получили ${combined.length}.`)
    console.error(`level1=${lvl1.length} level2=${lvl2.length} level3=${lvl3.length}`)
    process.exit(1)
  }

  const out = combined.map((w, idx) => {
    const translation = pickRuTranslation(w.translations)
    const topic = inferTopic({ hanzi: w.hanzi, pinyin: w.pinyin, ru: translation })
    return {
      id: idx + 1,
      hanzi: w.hanzi,
      pinyin: w.pinyin,
      translation,
      hsk_level: Number(w.level),
      topic,
      example_zh: '',
      example_pinyin: '',
      example_ru: '',
    }
  })

  fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2), 'utf8')
  console.log(`Готово: ${OUT_PATH} (${out.length} слов)`)
}

main()

