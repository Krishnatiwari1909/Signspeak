import { useCallback, useEffect, useRef, useState } from 'react'
import { CONFIG } from '../config.js'
import { createPredictionGate } from '../lib/predictionGate.js'
import { prettyLabel } from '../lib/predictions.js'
import { synthesizeLocalSentence, translateSentenceWithAI } from '../lib/grammar.js'
import { useSpeech } from './useSpeech.js'

const MAX_ITEMS = 60
const AUTO_TRANSLATE_DELAY_MS = 3500 // 3.5s pause before auto-translating full sentence

/**
 * Turns model predictions into real-time words or complete, grammatically-correct sentences.
 */
export function useTranslator(activeConfig = CONFIG) {
  const speech = useSpeech()
  const [mode, setMode] = useState('sentence') // 'sentence' | 'live'
  const [words, setWords] = useState([]) // [{ id, text }]
  const [sentences, setSentences] = useState([]) // [{ id, text, glosses }]
  const [activeGlosses, setActiveGlosses] = useState([]) // Current in-progress sentence glosses
  const [countdown, setCountdown] = useState(null) // e.g. "3.5" seconds remaining
  const [threshold, setThreshold] = useState(activeConfig.minConfidence ?? CONFIG.minConfidence)
  const [apiKey, setApiKey] = useState('')
  const [isTranslating, setIsTranslating] = useState(false)

  const modeRef = useRef(mode)
  const thresholdRef = useRef(threshold)
  const speakRef = useRef(speech.speak)
  const apiKeyRef = useRef(apiKey)
  const activeConfigRef = useRef(activeConfig)
  const activeGlossesRef = useRef([])
  const nextId = useRef(0)

  // Countdown timer refs
  const autoTranslateDeadlineRef = useRef(0)
  const countdownIntervalRef = useRef(null)

  useEffect(() => {
    activeConfigRef.current = activeConfig
    setThreshold(activeConfig.minConfidence ?? CONFIG.minConfidence)
  }, [activeConfig])

  useEffect(() => {
    modeRef.current = mode
  }, [mode])

  useEffect(() => {
    thresholdRef.current = threshold
  }, [threshold])

  useEffect(() => {
    speakRef.current = speech.speak
  }, [speech.speak])

  useEffect(() => {
    apiKeyRef.current = apiKey
  }, [apiKey])

  const clearCountdown = useCallback(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current)
      countdownIntervalRef.current = null
    }
    autoTranslateDeadlineRef.current = 0
    setCountdown(null)
  }, [])

  // Explicitly finish and translate the active sentence
  const finishSentence = useCallback(async () => {
    clearCountdown()

    const glossesToTranslate = [...activeGlossesRef.current]
    if (glossesToTranslate.length === 0) return

    // Clear active queue immediately for snappy UI feedback
    activeGlossesRef.current = []
    setActiveGlosses([])
    setIsTranslating(true)

    try {
      const sentenceText = apiKeyRef.current
        ? await translateSentenceWithAI(glossesToTranslate, apiKeyRef.current)
        : synthesizeLocalSentence(glossesToTranslate)

      if (sentenceText) {
        const id = nextId.current++
        setSentences((prev) => [
          ...prev,
          { id, text: sentenceText, glosses: glossesToTranslate },
        ].slice(-MAX_ITEMS))

        // Speak the completed grammatical sentence
        speakRef.current(sentenceText)
      }
    } finally {
      setIsTranslating(false)
    }
  }, [clearCountdown])

  const startOrResetCountdown = useCallback(() => {
    autoTranslateDeadlineRef.current = Date.now() + AUTO_TRANSLATE_DELAY_MS
    setCountdown((AUTO_TRANSLATE_DELAY_MS / 1000).toFixed(1))

    if (!countdownIntervalRef.current) {
      countdownIntervalRef.current = setInterval(() => {
        const remainingMs = autoTranslateDeadlineRef.current - Date.now()
        if (remainingMs <= 0) {
          clearCountdown()
          finishSentence()
        } else {
          setCountdown((remainingMs / 1000).toFixed(1))
        }
      }, 150)
    }
  }, [clearCountdown, finishSentence])

  const undoLastSign = useCallback(() => {
    if (activeGlossesRef.current.length === 0) return
    activeGlossesRef.current = activeGlossesRef.current.slice(0, -1)
    setActiveGlosses([...activeGlossesRef.current])

    if (activeGlossesRef.current.length === 0) {
      clearCountdown()
    } else {
      startOrResetCountdown()
    }
  }, [clearCountdown, startOrResetCountdown])

  const [gate] = useState(() =>
    createPredictionGate({
      votesRequired: activeConfig.votesRequired ?? CONFIG.votesRequired,
      cooldownMs: activeConfig.cooldownMs ?? CONFIG.cooldownMs,
      onCommit: (label) => {
        const text = prettyLabel(label)
        const id = nextId.current++

        // 1. Live word mode: add word and speak immediately
        setWords((prev) => [...prev, { id, text }].slice(-MAX_ITEMS))
        if (modeRef.current === 'live') {
          speakRef.current(text)
        }

        // 2. Sentence mode: append to active glosses queue and restart sentence pause countdown
        if (modeRef.current === 'sentence') {
          // Avoid appending exact duplicate sign in immediate succession
          if (activeGlossesRef.current[activeGlossesRef.current.length - 1] !== label) {
            activeGlossesRef.current = [...activeGlossesRef.current, label]
            setActiveGlosses([...activeGlossesRef.current])
            startOrResetCountdown()
          }
        }
      },
    })
  )

  /** prediction: { label, confidence, margin, probs } | null */
  const onPrediction = useCallback(
    (prediction, now) => {
      const idleLabel = activeConfigRef.current?.idleLabel
      const confident =
        prediction &&
        (!idleLabel || prediction.label !== idleLabel) &&
        prediction.confidence >= thresholdRef.current

      gate.update(confident ? prediction.label : null, prediction?.confidence ?? 0, now)
    },
    [gate]
  )

  const { cancel } = speech
  const clear = useCallback(() => {
    clearCountdown()
    activeGlossesRef.current = []
    setActiveGlosses([])
    setWords([])
    setSentences([])
    cancel()
  }, [cancel, clearCountdown])

  return {
    mode,
    setMode,
    words,
    sentences,
    activeGlosses,
    countdown,
    isTranslating,
    finishSentence,
    undoLastSign,
    threshold,
    setThreshold,
    apiKey,
    setApiKey,
    onPrediction,
    clear,
    speech,
  }
}
