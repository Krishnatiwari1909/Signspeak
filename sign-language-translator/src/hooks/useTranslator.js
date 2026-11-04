import { useCallback, useEffect, useRef, useState } from 'react'
import { CONFIG } from '../config.js'
import { createPredictionGate } from '../lib/predictionGate.js'
import { prettyLabel } from '../lib/predictions.js'
import { synthesizeLocalSentence, translateSentenceWithAI } from '../lib/grammar.js'
import { useSpeech } from './useSpeech.js'

const MAX_ITEMS = 60
const IDLE_SENTENCE_TIMEOUT_MS = 1400

/**
 * Turns model predictions into real-time words or complete, grammatically-correct sentences.
 */
export function useTranslator() {
  const speech = useSpeech()
  const [mode, setMode] = useState('sentence') // 'sentence' | 'live'
  const [words, setWords] = useState([]) // [{ id, text }]
  const [sentences, setSentences] = useState([]) // [{ id, text, glosses }]
  const [activeGlosses, setActiveGlosses] = useState([]) // Current in-progress sentence glosses
  const [threshold, setThreshold] = useState(CONFIG.minConfidence)
  const [apiKey, setApiKey] = useState('')
  const [isTranslating, setIsTranslating] = useState(false)

  const modeRef = useRef(mode)
  const thresholdRef = useRef(threshold)
  const speakRef = useRef(speech.speak)
  const apiKeyRef = useRef(apiKey)
  const activeGlossesRef = useRef([])
  const nextId = useRef(0)
  const idleTimerRef = useRef(null)

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

  // Explicitly finish and translate the active sentence
  const finishSentence = useCallback(async () => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current)
      idleTimerRef.current = null
    }

    const glossesToTranslate = [...activeGlossesRef.current]
    if (glossesToTranslate.length === 0) return

    // Clear active queue immediately for snappy UI
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
  }, [])

  const [gate] = useState(() =>
    createPredictionGate({
      votesRequired: CONFIG.votesRequired,
      cooldownMs: CONFIG.cooldownMs,
      onCommit: (label) => {
        const text = prettyLabel(label)
        const id = nextId.current++

        // 1. Live word mode: add word and speak immediately
        setWords((prev) => [...prev, { id, text }].slice(-MAX_ITEMS))
        if (modeRef.current === 'live') {
          speakRef.current(text)
        }

        // 2. Sentence mode: append to active glosses queue
        if (modeRef.current === 'sentence') {
          // Avoid appending exact duplicate sign in immediate succession
          if (activeGlossesRef.current[activeGlossesRef.current.length - 1] !== label) {
            activeGlossesRef.current = [...activeGlossesRef.current, label]
            setActiveGlosses([...activeGlossesRef.current])
          }

          // Reset idle timeout timer whenever a new word is signed
          if (idleTimerRef.current) {
            clearTimeout(idleTimerRef.current)
            idleTimerRef.current = null
          }
        }
      },
    })
  )

  /** prediction: { label, confidence, probs } | null */
  const onPrediction = useCallback(
    (prediction, now) => {
      const confident =
        prediction &&
        prediction.label !== CONFIG.idleLabel &&
        prediction.confidence >= thresholdRef.current

      gate.update(confident ? prediction.label : null, prediction?.confidence ?? 0, now)

      // In sentence mode: if hands are resting or idle, start the sentence completion timer
      if (modeRef.current === 'sentence' && activeGlossesRef.current.length > 0) {
        if (!confident && !idleTimerRef.current) {
          idleTimerRef.current = setTimeout(() => {
            finishSentence()
          }, IDLE_SENTENCE_TIMEOUT_MS)
        }
      }
    },
    [gate, finishSentence]
  )

  const { cancel } = speech
  const clear = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current)
      idleTimerRef.current = null
    }
    activeGlossesRef.current = []
    setActiveGlosses([])
    setWords([])
    setSentences([])
    cancel()
  }, [cancel])

  return {
    mode,
    setMode,
    words,
    sentences,
    activeGlosses,
    isTranslating,
    finishSentence,
    threshold,
    setThreshold,
    apiKey,
    setApiKey,
    onPrediction,
    clear,
    speech,
  }
}
