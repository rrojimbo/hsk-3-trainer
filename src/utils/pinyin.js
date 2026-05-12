export function normalizePinyin(input) {
  if (!input) return ''
  return String(input)
    .trim()
    .toLowerCase()
    .replaceAll('u:', 'ü')
    .replaceAll('v', 'ü')
    .replace(/\s+/g, ' ')
}

export function isPinyinMatch(userInput, expected) {
  const a = normalizePinyin(userInput)
  const b = normalizePinyin(expected)
  if (!a || !b) return false
  return a === b
}

