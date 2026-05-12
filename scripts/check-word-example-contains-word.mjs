import fs from 'node:fs'
import path from 'node:path'

const WORDS_PATH = path.resolve('src', 'data', 'words.json')

function main() {
  const words = JSON.parse(fs.readFileSync(WORDS_PATH, 'utf8'))
  const missing = []

  for (const w of words) {
    const hanzi = String(w.hanzi || '').trim()
    const ex = String(w.example_zh || '').trim()
    if (!hanzi || !ex) continue
    if (!ex.includes(hanzi)) {
      missing.push({ id: w.id, hanzi: w.hanzi, example_zh: w.example_zh, translation: w.translation })
    }
  }

  console.log(
    JSON.stringify(
      {
        total_words: words.length,
        missing_count: missing.length,
        sample: missing.slice(0, 30),
      },
      null,
      2,
    ),
  )
}

main()

