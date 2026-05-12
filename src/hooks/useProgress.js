import { useCallback, useEffect, useMemo, useState } from 'react'

const KEYS = {
  words: 'hsk_words_progress',
  grammar: 'hsk_grammar_progress',
  examResults: 'hsk_exam_results',
  streak: 'hsk_streak',
  examDate: 'hsk_exam_date',
  dailySessions: 'hsk_daily_sessions',
  settings: 'hsk_settings',
}

function safeParse(json, fallback) {
  try {
    return JSON.parse(json)
  } catch {
    return fallback
  }
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

export function useProgress() {
  const [tick, setTick] = useState(0)

  const read = useCallback((key, fallback) => {
    const raw = localStorage.getItem(key)
    if (raw == null) return fallback
    return safeParse(raw, fallback)
  }, [])

  const write = useCallback((key, value) => {
    localStorage.setItem(key, JSON.stringify(value))
    setTick((t) => t + 1)
  }, [])

  // Ensure defaults exist
  useEffect(() => {
    if (localStorage.getItem(KEYS.words) == null) write(KEYS.words, {})
    if (localStorage.getItem(KEYS.grammar) == null) write(KEYS.grammar, {})
    if (localStorage.getItem(KEYS.examResults) == null) write(KEYS.examResults, [])
    if (localStorage.getItem(KEYS.dailySessions) == null) write(KEYS.dailySessions, [])
    if (localStorage.getItem(KEYS.streak) == null) write(KEYS.streak, { last_date: null, count: 0 })
    if (localStorage.getItem(KEYS.examDate) == null) write(KEYS.examDate, '2025-05-16')
    if (localStorage.getItem(KEYS.settings) == null)
      write(KEYS.settings, { pinyinPosition: 'below' }) // 'above' | 'below'
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const wordsProgress = useMemo(() => read(KEYS.words, {}), [read, tick])
  const grammarProgress = useMemo(() => read(KEYS.grammar, {}), [read, tick])
  const examResults = useMemo(() => read(KEYS.examResults, []), [read, tick])
  const streak = useMemo(() => read(KEYS.streak, { last_date: null, count: 0 }), [read, tick])
  const examDate = useMemo(() => read(KEYS.examDate, '2025-05-16'), [read, tick])
  const dailySessions = useMemo(() => read(KEYS.dailySessions, []), [read, tick])
  const settings = useMemo(() => read(KEYS.settings, { pinyinPosition: 'below' }), [read, tick])

  const ensureTodaySession = useCallback(() => {
    const d = todayISO()
    const sessions = read(KEYS.dailySessions, [])
    if (!sessions.includes(d)) write(KEYS.dailySessions, [...sessions, d])

    const s = read(KEYS.streak, { last_date: null, count: 0 })
    if (s.last_date === d) return

    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    const next =
      s.last_date === yesterday
        ? { last_date: d, count: Math.max(1, (s.count || 0) + 1) }
        : { last_date: d, count: 1 }
    write(KEYS.streak, next)
  }, [read, write])

  const setExamDate = useCallback((isoDate) => write(KEYS.examDate, isoDate), [write])
  const setSettings = useCallback((next) => write(KEYS.settings, next), [write])

  const setWordProgress = useCallback(
    (wordId, patch) => {
      const all = read(KEYS.words, {})
      const prev = all[String(wordId)] ?? { status: 'new', correctStreak: 0, wrongCount: 0, lastSeen: null }
      const next = { ...prev, ...patch }
      all[String(wordId)] = next
      write(KEYS.words, all)
      ensureTodaySession()
    },
    [ensureTodaySession, read, write],
  )

  const setGrammarDone = useCallback(
    (grammarId, done) => {
      const all = read(KEYS.grammar, {})
      all[String(grammarId)] = Boolean(done)
      write(KEYS.grammar, all)
      ensureTodaySession()
    },
    [ensureTodaySession, read, write],
  )

  const addExamResult = useCallback(
    (result) => {
      const prev = read(KEYS.examResults, [])
      const next = Array.isArray(prev) ? [...prev, result] : [result]
      write(KEYS.examResults, next)
      ensureTodaySession()
    },
    [ensureTodaySession, read, write],
  )

  return {
    keys: KEYS,
    wordsProgress,
    grammarProgress,
    examResults,
    streak,
    examDate,
    dailySessions,
    settings,
    setExamDate,
    setSettings,
    setWordProgress,
    setGrammarDone,
    addExamResult,
    ensureTodaySession,
  }
}

