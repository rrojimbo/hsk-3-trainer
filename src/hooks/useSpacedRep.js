import { useMemo } from 'react'

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function useSpacedRepQueue(words, wordsProgress, { only = 'all' } = {}) {
  return useMemo(() => {
    const items = words.map((w) => {
      const p = wordsProgress?.[String(w.id)] ?? { status: 'new', correctStreak: 0, wrongCount: 0 }
      return { word: w, progress: p }
    })

    const learning = items.filter((i) => i.progress.status === 'learning' || i.progress.status === 'hard')
    const known = items.filter((i) => i.progress.status === 'known')
    const fresh = items.filter((i) => !i.progress.status || i.progress.status === 'new')

    if (only === 'known') return shuffle(known)
    if (only === 'learning') return shuffle(learning)
    if (only === 'new') return shuffle(fresh)
    if (only === 'problem') return shuffle(items.filter((i) => (i.progress.wrongCount ?? 0) >= 3))

    return [...shuffle(learning), ...shuffle(fresh), ...shuffle(known)]
  }, [only, words, wordsProgress])
}

export function nextWordAfterAnswer(prevItem, wasCorrect) {
  const prev = prevItem?.progress ?? { status: 'new', correctStreak: 0, wrongCount: 0 }

  if (wasCorrect) {
    const correctStreak = (prev.correctStreak ?? 0) + 1
    const status =
      prev.status === 'known'
        ? 'known'
        : correctStreak >= 3
          ? 'known'
          : prev.status === 'new'
            ? 'learning'
            : prev.status
    return { ...prev, status, correctStreak }
  }

  return {
    ...prev,
    status: 'learning',
    correctStreak: 0,
    wrongCount: (prev.wrongCount ?? 0) + 1,
  }
}

