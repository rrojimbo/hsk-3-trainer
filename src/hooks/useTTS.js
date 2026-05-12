import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

function pickVoice(voices, langPrefix) {
  if (!voices || voices.length === 0) return null
  const byLang = voices.filter((v) => (v.lang || '').toLowerCase().startsWith(langPrefix.toLowerCase()))
  return byLang[0] ?? voices[0] ?? null
}

export function useTTS({ defaultLang = 'zh-CN' } = {}) {
  const [available] = useState(() => typeof window !== 'undefined' && 'speechSynthesis' in window)
  const [voices, setVoices] = useState([])
  const [voiceName, setVoiceName] = useState('')
  const synthRef = useRef(null)

  useEffect(() => {
    if (!available) return
    synthRef.current = window.speechSynthesis

    const load = () => {
      const list = synthRef.current?.getVoices?.() ?? []
      setVoices(list)
      const picked = list.find((v) => v.name === voiceName) ?? pickVoice(list, defaultLang) ?? null
      if (picked && picked.name !== voiceName) setVoiceName(picked.name)
    }

    load()
    synthRef.current.onvoiceschanged = load
    return () => {
      if (synthRef.current) synthRef.current.onvoiceschanged = null
    }
  }, [available, defaultLang, voiceName])

  const voice = useMemo(() => voices.find((v) => v.name === voiceName) ?? null, [voices, voiceName])

  const speak = useCallback(
    (text, { lang = defaultLang, rate = 1.0, pitch = 1.0 } = {}) => {
      if (!available) return false
      if (!text || !String(text).trim()) return false
      const u = new SpeechSynthesisUtterance(String(text))
      u.lang = lang
      u.rate = rate
      u.pitch = pitch
      if (voice) u.voice = voice
      window.speechSynthesis.cancel()
      window.speechSynthesis.speak(u)
      return true
    },
    [available, defaultLang, voice],
  )

  const cancel = useCallback(() => {
    if (!available) return
    window.speechSynthesis.cancel()
  }, [available])

  return {
    available,
    voices,
    voiceName,
    setVoiceName,
    speak,
    cancel,
  }
}

