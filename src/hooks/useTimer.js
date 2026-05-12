import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

export function useTimer({ initialSeconds = 0, autoStart = false } = {}) {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds)
  const [running, setRunning] = useState(autoStart)
  const intervalRef = useRef(null)

  const stop = useCallback(() => setRunning(false), [])
  const start = useCallback(() => setRunning(true), [])
  const reset = useCallback((nextSeconds = initialSeconds) => {
    setSecondsLeft(nextSeconds)
    setRunning(false)
  }, [initialSeconds])

  useEffect(() => {
    if (!running) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      intervalRef.current = null
      return
    }
    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0))
    }, 1000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [running])

  useEffect(() => {
    if (secondsLeft === 0) setRunning(false)
  }, [secondsLeft])

  const mmss = useMemo(() => {
    const m = Math.floor(secondsLeft / 60)
    const s = secondsLeft % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }, [secondsLeft])

  return { secondsLeft, mmss, running, start, stop, reset, setSecondsLeft }
}

