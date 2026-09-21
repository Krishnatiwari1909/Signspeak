import { useCallback, useEffect, useRef, useState } from 'react'
import { CONFIG } from '../config.js'
import { createPredictionGate } from '../lib/predictionGate.js'
import { prettyLabel } from '../lib/predictions.js'
import { useSpeech } from './useSpeech.js'

const MAX_WORDS = 60

/**
 * Turns model predictions into a transcript and speech.
 * `onPrediction` is passed to the pipeline; React state changes only when a word is committed.
 */
export function useTranslator() {
  const speech = useSpeech()
  const [words, setWords] = useState([]) // [{ id, text }]
  const [threshold, setThreshold] = useState(CONFIG.minConfidence)

  const thresholdRef = useRef(threshold)
  const speakRef = useRef(speech.speak)
  const nextId = useRef(0)

  useEffect(() => {
    thresholdRef.current = threshold
  }, [threshold])

  useEffect(() => {
    speakRef.current = speech.speak
  }, [speech.speak])

  const [gate] = useState(() =>
    createPredictionGate({
      votesRequired: CONFIG.votesRequired,
      cooldownMs: CONFIG.cooldownMs,
      onCommit: (label) => {
        const text = prettyLabel(label)
        const id = nextId.current++
        setWords((prev) => [...prev, { id, text }].slice(-MAX_WORDS))
        speakRef.current(text)
      },
    })
  )

  /** prediction: { label, confidence, probs } | null (null = not enough hand data in the window) */
  const onPrediction = useCallback(
    (prediction, now) => {
      const confident =
        prediction &&
        prediction.label !== CONFIG.idleLabel &&
        prediction.confidence >= thresholdRef.current
      gate.update(confident ? prediction.label : null, prediction?.confidence ?? 0, now)
    },
    [gate]
  )

  const { cancel } = speech
  const clear = useCallback(() => {
    setWords([])
    cancel()
  }, [cancel])

  return { words, threshold, setThreshold, onPrediction, clear, speech }
}
