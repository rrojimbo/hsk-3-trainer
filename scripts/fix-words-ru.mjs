import fs from 'node:fs'
import path from 'node:path'

const WORDS_PATH = path.resolve('src', 'data', 'words.json')
const RAW_PATH = path.resolve('scripts', 'hsk.raw.json')

function safeJson(pathname) {
  return JSON.parse(fs.readFileSync(pathname, 'utf8'))
}

function normalizeRuTranslation(s) {
  if (!s) return ''
  let t = String(s).trim()

  // Убираем служебные приписки про счетные слова (часто из словарей)
  // Примеры: "самолет (счетное слово 架 jià)" -> "самолет"
  t = t.replace(/\s*\((сч[её]тн(ое|ого)\s+слово|сч\.\s*слово)[^)]+\)\s*/gi, ' ')
  t = t.replace(/\s*\((счетное слово)[^)]+\)\s*/gi, ' ')
  t = t.replace(/\s*сч\.\s*слово\s*[^,)]+[)\s]*/gi, ' ')
  t = t.replace(/\s*счетное\s+слово\s*[^,)]+[)\s]*/gi, ' ')

  // Если перевод превратился в "счетное слово ..." (т.е. был только про счетное слово) — считаем пустым
  const lower = t.toLowerCase()
  if (lower.includes('счетное слово') || lower.includes('сч. слово')) return ''

  // Чистим лишние пробелы/скобки/хвосты
  t = t.replace(/\s+/g, ' ').trim()
  t = t.replace(/^[,;)\]]+/, '').replace(/[,;(\[]+$/, '').trim()

  // Если осталась незакрытая скобка — обрежем хвост (для UI лучше чистое слово)
  if (t.includes('(') && !t.includes(')')) {
    t = t.split('(')[0].trim()
  }

  // Если остались любые скобочные пояснения — для словарных переводов часто полезнее убрать
  // "самолет (букв....)" -> "самолет"
  t = t.replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim()

  // Сносим одинокие закрывающие скобки и мусорные хвосты вроде "ge)"
  t = t.replace(/[)\]]+$/g, '').trim()
  t = t.replace(/\b[a-z]+\)\b/gi, '').replace(/\b[a-z]+\b/gi, (m) => (m.length <= 2 ? '' : m))
  t = t.replace(/\s+/g, ' ').trim()

  return t
}

function hasCyrillic(s) {
  return /[а-яё]/i.test(String(s))
}

function pickBestRu(translationsRus = []) {
  const candidates = (translationsRus ?? [])
    .map((x) => normalizeRuTranslation(x))
    .filter((x) => x && x.length >= 2 && hasCyrillic(x))

  // Предпочитаем варианты без цифр и без явных служебных слов
  const prefer = candidates.filter((x) => !/\d/.test(x) && !x.toLowerCase().includes('счетное'))
  if (prefer.length > 0) return prefer.sort((a, b) => a.length - b.length)[0]
  if (candidates.length > 0) return candidates.sort((a, b) => a.length - b.length)[0]
  return ''
}

function uniq(arr) {
  return Array.from(new Set(arr.filter(Boolean)))
}

function normalizeClassifierList(list) {
  const items = uniq(list)
  const byHanzi = new Map()

  for (const it of items) {
    const m = String(it).match(/^([一-龥]{1,2})(?:\s*\(([^)]+)\))?$/)
    if (!m) continue
    const hanzi = m[1]
    const pin = (m[2] ?? '').trim()

    const prev = byHanzi.get(hanzi)
    // предпочитаем вариант с пиньинем и без явно битого короткого "ji"
    const pinLooksBad = pin && /^[a-z]{1,2}$/i.test(pin)
    const prevPin = prev?.pin ?? ''
    const prevBad = prevPin && /^[a-z]{1,2}$/i.test(prevPin)

    if (!prev) {
      byHanzi.set(hanzi, { hanzi, pin })
      continue
    }

    if (prev.pin && !pin) continue
    if (!prev.pin && pin) {
      byHanzi.set(hanzi, { hanzi, pin })
      continue
    }

    if (prevBad && !pinLooksBad) {
      byHanzi.set(hanzi, { hanzi, pin })
      continue
    }
  }

  return Array.from(byHanzi.values()).map((x) => (x.pin ? `${x.hanzi} (${x.pin})` : x.hanzi))
}

function extractClassifiersFromText(text) {
  const t = String(text || '')
  const out = []

  // RU patterns: "счетное слово 个 ge или 位 wèi"
  for (const m of t.matchAll(/([一-龥]{1,2})\s+([a-zü:]+)\b/gi)) {
    const hanzi = m[1]
    const pin = m[2].replaceAll('u:', 'ü')
    // Filter out случайные пары (например, из "букв.")
    if (hanzi.length >= 1 && hanzi.length <= 2 && pin.length >= 2 && pin.length <= 8) {
      out.push(`${hanzi} (${pin})`)
    }
  }

  // EN patterns: "CL:個|个, 位[wèi]" "CL:台|台[ tái ]"
  if (t.includes('CL:')) {
    const after = t.split('CL:')[1] ?? ''
    const chunk = after.split(/;|\.|\)|$/)[0]
    const parts = chunk.split(/,|\s+/).map((x) => x.trim()).filter(Boolean)
    for (const p of parts) {
      // 個|个
      const hanziMatch = p.match(/[一-龥]{1,2}(\|[一-龥]{1,2})?/)
      const pinMatch = p.match(/\[([^\]]+)\]/)
      if (hanziMatch) {
        const hanzi = hanziMatch[0].split('|')[1] ?? hanziMatch[0].split('|')[0]
        const pin = pinMatch?.[1]?.trim()
        out.push(pin ? `${hanzi} (${pin})` : `${hanzi}`)
      }
    }
  }

  return uniq(out)
}

function extractClassifiers(rawItem) {
  const ru = rawItem?.translations?.rus ?? []
  const en = rawItem?.translations?.eng ?? []
  const fromRu = ru.flatMap(extractClassifiersFromText)
  const fromEn = en.flatMap(extractClassifiersFromText)
  return normalizeClassifierList([...fromRu, ...fromEn])
}

function main() {
  if (!fs.existsSync(WORDS_PATH)) throw new Error(`Missing ${WORDS_PATH}`)
  if (!fs.existsSync(RAW_PATH)) throw new Error(`Missing ${RAW_PATH}`)

  const words = safeJson(WORDS_PATH)
  const raw = safeJson(RAW_PATH)
  const rawByHanzi = new Map()
  for (const r of raw) rawByHanzi.set(r.hanzi, r)

  // Ручные русские переводы для позиций, где в исходнике нет русских значений.
  // Это в основном частицы/классификаторы/служебные слова.
  const manualRu = {
    本: 'счётное слово для книг/журналов/тетрадей',
    个: 'универсальное счётное слово',
    吗: 'вопросительная частица',
    呢: 'частица (вопрос/«а что насчёт…?»/продолжение темы)',
    吧: 'частица (предложение/предположение)',
    件: 'счётное слово для одежды/дел/предметов',
    男人: 'мужчина',
    所以: 'поэтому',
    踢: 'пинать; ударять ногой',
    着: 'частица длительности/сопутствующего состояния (…着)',
    啊: 'частица (восклиц./смягчение)',
    被: 'пассивная частица «被»; также: одеяло',
    地: 'служебное слово (наречное): -ly, «…-но» (认真地说)',
    电子: 'электронный; электро-',
    刮: 'дуть (о ветре); скрести/брить',
    花园: 'сад',
    黄: 'жёлтый',
    辆: 'счётное слово для машин/транспорта',
    刷: 'чистить щёткой;刷牙 чистить зубы',
    虽然: 'хотя (хоть)',
    鞋: 'обувь; ботинок/туфля',
    信: 'письмо; верить',
    行李箱: 'чемодан',
    以后: 'после; потом; в будущем',
    只: 'только; всего лишь',
    祝: 'поздравлять; желать',
    字典: 'словарь',
  }

  let fixedEmpty = 0
  let fixedMeasure = 0
  let fixedAny = 0

  const next = words.map((w) => {
    const before = String(w.translation ?? '').trim()
    let translation = normalizeRuTranslation(before)

    const rawItem = rawByHanzi.get(w.hanzi)
    const rawRu = rawItem?.translations?.rus ?? []
    const bestFromRaw = pickBestRu(rawRu)
    const manual = manualRu[w.hanzi] ?? ''
    const classifiers = extractClassifiers(rawItem)

    // Если перевод "не русский" (нет кириллицы) — это обычно мусор (цифра, счетное слово, обрывок).
    // В этом случае предпочитаем нормальный русский вариант из raw.
    if (translation && !translation.startsWith('EN:') && !hasCyrillic(translation)) {
      translation = bestFromRaw || manual || translation
    }

    // Если перевод пустой/битый — берём лучший из raw
    if (!translation) {
      translation = bestFromRaw || manual
      if (translation) fixedEmpty++
    }

    // Если перевод есть, но он содержит только служебную инфу/скобки — тоже заменим
    const loweredBefore = before.toLowerCase()
    if (
      translation &&
      (loweredBefore.includes('счетное слово') ||
        loweredBefore.includes('сч. слово') ||
        before.trim().startsWith('('))
    ) {
      const cleaned = normalizeRuTranslation(before)
      const better = cleaned || bestFromRaw
      if (better && better !== before) {
        translation = better
        fixedMeasure++
      }
    }

    // Последний шанс: если всё ещё пусто, пробуем английский (лучше чем пусто)
    if (!translation) {
      const eng = rawItem?.translations?.eng?.[0]
      translation = eng ? `EN: ${String(eng).trim()}` : ''
    }

    if (translation !== before) fixedAny++
    return { ...w, translation, classifiers }
  })

  fs.writeFileSync(WORDS_PATH, JSON.stringify(next, null, 2), 'utf8')
  console.log(
    JSON.stringify(
      {
        total: next.length,
        fixed_any: fixedAny,
        fixed_empty: fixedEmpty,
        fixed_measure_or_parentheses: fixedMeasure,
      },
      null,
      2,
    ),
  )
}

main()

