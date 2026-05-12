import fs from 'node:fs'
import path from 'node:path'

const SOURCES = [
  { from: path.resolve('HSK 3 Tests'), to: path.resolve('public', 'official', 'HSK 3 Tests') },
  { from: path.resolve('HSKK Elementary'), to: path.resolve('public', 'official', 'HSKK Elementary') },
]

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true })
}

function copyFileIfNeeded(src, dst) {
  const s = fs.statSync(src)
  if (fs.existsSync(dst)) {
    const d = fs.statSync(dst)
    if (d.size === s.size && d.mtimeMs >= s.mtimeMs) return false
  }
  ensureDir(path.dirname(dst))
  fs.copyFileSync(src, dst)
  fs.utimesSync(dst, s.atime, s.mtime)
  return true
}

function walkCopy(srcRoot, dstRoot) {
  let copied = 0
  let total = 0
  const stack = [srcRoot]
  while (stack.length) {
    const cur = stack.pop()
    for (const ent of fs.readdirSync(cur, { withFileTypes: true })) {
      const src = path.join(cur, ent.name)
      const rel = path.relative(srcRoot, src)
      const dst = path.join(dstRoot, rel)
      if (ent.isDirectory()) {
        stack.push(src)
        continue
      }
      total++
      if (copyFileIfNeeded(src, dst)) copied++
    }
  }
  return { total, copied }
}

function main() {
  let sumTotal = 0
  let sumCopied = 0
  for (const s of SOURCES) {
    if (!fs.existsSync(s.from)) {
      console.warn(`Не найдено: ${s.from}`)
      continue
    }
    ensureDir(s.to)
    const r = walkCopy(s.from, s.to)
    sumTotal += r.total
    sumCopied += r.copied
  }
  console.log(JSON.stringify({ files_total: sumTotal, files_copied: sumCopied }, null, 2))
}

main()

