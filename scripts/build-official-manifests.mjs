import fs from 'node:fs'
import path from 'node:path'

const OUT_HSK3 = path.resolve('src', 'data', 'official-hsk3-tests.json')
const OUT_HSKK = path.resolve('src', 'data', 'official-hskk-elementary.json')

function walk(dir) {
  const out = []
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name)
    if (ent.isDirectory()) out.push(...walk(p))
    else out.push(p)
  }
  return out
}

function relPosix(p) {
  return p.split(path.sep).join('/')
}

function encodeUrlPath(urlPath) {
  // encodeURI сохраняет "/" и кодирует пробелы и спецсимволы.
  // Это важно для путей вида "/official/HSK 3 Tests/...试卷.pdf".
  return encodeURI(urlPath)
}

function pickBestPdf(code, pdfs) {
  const list = pdfs ?? []
  if (list.length === 0) return null

  const score = (f) => {
    const s = f.toLowerCase()
    let n = 0
    // Сам тест
    if (s.includes('试卷')) n += 1000
    if (s.includes('试题')) n += 900
    if (new RegExp(`/${code}\\.pdf$`, 'i').test(f)) n += 800

    // Полезные доп.материалы
    if (s.includes('听力材料')) n += 200
    if (s.includes('transkript')) n += 150

    // Ответы/решения — НЕ должны становиться "главным"
    if (s.includes('答案')) n -= 300
    if (s.includes('loesung')) n -= 300
    if (s.includes('lösung')) n -= 300

    return n
  }

  return [...list].sort((a, b) => score(b) - score(a))[0]
}

function groupByTest(rootDir) {
  // Берём ассеты из public/official, чтобы они работали на GitHub Pages/Vercel
  const absRoot = path.resolve('public', 'official', rootDir)
  const all = walk(absRoot)

  const tests = new Map()
  for (const p of all) {
    // URL относительно public: "/official/..."
    const rel = `/` + relPosix(path.relative(path.resolve('public'), p))
    const parts = rel.split('/')
    const idx = parts.findIndex((x) => /^H\d+$/i.test(x))
    if (idx === -1) continue
    const code = parts[idx]
    const arr = tests.get(code) ?? []
    arr.push(rel)
    tests.set(code, arr)
  }

  const result = Array.from(tests.entries())
    .map(([code, files]) => {
      const pdfs = files.filter((f) => f.toLowerCase().endsWith('.pdf'))
      const audio = files.filter((f) => /\.(mp3|wma|wav|ogg|m4a)$/i.test(f))

      const pdf_test = pdfs.find((f) => f.includes('试卷') || f.includes('试题')) ?? null
      const pdf_listening_material = pdfs.find((f) => f.includes('听力材料')) ?? null
      const pdf_answers =
        pdfs.find((f) => f.includes('答案')) ??
        pdfs.find((f) => /loesung/i.test(f)) ??
        null
      const pdf_transcript = pdfs.find((f) => /transkript/i.test(f)) ?? null

      const encodeMaybe = (p) => (p ? encodeUrlPath(p) : null)

      return {
        code,
        pdf_main: encodeMaybe(pickBestPdf(code, pdfs)),
        pdf_test: encodeMaybe(pdf_test),
        pdf_listening_material: encodeMaybe(pdf_listening_material),
        pdf_answers: encodeMaybe(pdf_answers),
        pdf_transcript: encodeMaybe(pdf_transcript),
        pdf_all: pdfs.map(encodeUrlPath),
        audio: audio.length ? audio.map(encodeUrlPath) : [],
        files_count: files.length,
      }
    })
    .sort((a, b) => a.code.localeCompare(b.code))

  return result
}

function writeJson(p, data) {
  fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf8')
}

function main() {
  const hsk3 = groupByTest('HSK 3 Tests')
  const hskk = groupByTest('HSKK Elementary')

  writeJson(OUT_HSK3, { generated_at: new Date().toISOString(), items: hsk3 })
  writeJson(OUT_HSKK, { generated_at: new Date().toISOString(), items: hskk })

  console.log(JSON.stringify({ hsk3: hsk3.length, hskk: hskk.length }, null, 2))
}

main()

