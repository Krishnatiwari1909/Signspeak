import { useCallback, useEffect, useRef, useState } from 'react'

const supported = typeof window !== 'undefined' && 'speechSynthesis' in window

export function useSpeech({ lang = 'en-US' } = {}) {
  const [enabled, setEnabled] = useState(false)
  const enabledRef = useRef(false) // keeps speak() referentially stable

  const speak = useCallback(
    (text) => {
      if (!supported || !enabledRef.current) return
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = lang
      window.speechSynthesis.speak(utterance) // the browser queues utterances in order
    },
    [lang]
  )

  const cancel = useCallback(() => {
    if (supported) window.speechSynthesis.cancel()
  }, [])

  const toggle = useCallback(() => {
    if (!supported) return
    const next = !enabledRef.current
    enabledRef.current = next
    setEnabled(next)
    if (next) {
      // Runs inside a click handler, which satisfies the browser's user-activation rule.
      // Without a user gesture first, Chrome and Safari silently refuse to speak.
      speak('Voice on')
    } else {
      cancel()
    }
  }, [speak, cancel])

  useEffect(() => cancel, [cancel])

  return { supported, enabled, toggle, speak, cancel }
}
