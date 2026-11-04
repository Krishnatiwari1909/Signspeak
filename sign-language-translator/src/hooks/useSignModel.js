import { useEffect, useRef, useState, useCallback } from 'react'
import { AVAILABLE_MODELS, DEFAULT_MODEL_ID } from '../config.js'
import { initBackend, loadLabels, loadSignModel, warmUp } from '../lib/model.js'

/**
 * Loads and manages sign recognition models (Google GISLR ONNX or Custom TFJS).
 * Supports hot-switching between models without reloading the page.
 */
export function useSignModel(initialModelId = DEFAULT_MODEL_ID) {
  const [modelId, setModelId] = useState(initialModelId)
  const modelRef = useRef(null)
  const labelsRef = useRef([])
  const [state, setState] = useState({
    status: 'loading',
    source: null,
    backend: null,
    error: '',
  })

  const activeConfig = AVAILABLE_MODELS[modelId] || AVAILABLE_MODELS[DEFAULT_MODEL_ID]

  useEffect(() => {
    let cancelled = false
    setState((prev) => ({ ...prev, status: 'loading', error: '' }))

    async function init() {
      let loadedModelMeta = null
      try {
        const backend = await initBackend(activeConfig)
        const labels = await loadLabels(activeConfig)
        const loaded = await loadSignModel(activeConfig)
        loadedModelMeta = loaded

        await warmUp(loaded, activeConfig)

        if (cancelled) {
          loaded.dispose?.()
          return
        }

        // Clean up previous model before replacing
        modelRef.current?.dispose?.()
        modelRef.current = loaded
        labelsRef.current = labels

        setState({
          status: 'ready',
          source: loaded.source,
          backend,
          error: '',
        })
      } catch (err) {
        loadedModelMeta?.dispose?.()
        if (cancelled) return
        console.error('Sign model load failed:', err)
        setState({
          status: 'error',
          source: null,
          backend: null,
          error: `Could not load ${activeConfig.name}. ${err?.message ?? ''}`.trim(),
        })
      }
    }

    init()

    return () => {
      cancelled = true
    }
  }, [modelId, activeConfig])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      modelRef.current?.dispose?.()
      modelRef.current = null
    }
  }, [])

  const switchModel = useCallback((newId) => {
    if (AVAILABLE_MODELS[newId]) {
      setModelId(newId)
    }
  }, [])

  return {
    modelRef,
    labelsRef,
    modelId,
    switchModel,
    activeConfig,
    availableModels: AVAILABLE_MODELS,
    ...state,
  }
}
