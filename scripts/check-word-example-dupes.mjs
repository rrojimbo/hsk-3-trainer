import fs from 'node:fs'
import path from 'node:path'

const WORDS_PATH = path.resolve('src', 'data', 'words.json')

function norm(s) {
  return String(s || '').replace(/\s+/g, ' ').trim()
}

function main() {
  const words = JSON.parse(fs.readFileSync(WORDS_PATH, 'utf8'))

  const byZh = new Map()
  for (const w of words) {
    const key = norm(w.example_zh)
    if (!key) continue
    const arr = byZh.get(key) ?? []
    arr.push(w)
    byZh.set(key, arr)
  }

  const dupes = [...byZh.entries()].filter(([, arr]) => arr.length > 1).sort((a, b) => b[1].length - a[1].length)
  const dupeWordsCount = dupes.reduce((acc, [, arr]) => acc + arr.length, 0)

  console.log(
    JSON.stringify(
      {
        total_words: words.length,
        unique_examples_zh: byZh.size,
        dupe_groups: dupes.length,
        words_in_dupes: dupeWordsCount,
        top_10: dupes.slice(0, 10).map(([zh, arr]) => ({
          example_zh: zh,
          count: arr.length,
          word_ids: arr.map((x) => x.id),
          hanzi: arr.map((x) => x.hanzi),
        })),
      },
      null,
      2,
    ),
  )
}

main()

