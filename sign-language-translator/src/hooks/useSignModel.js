import { useEffect, useRef, useState } from 'react'
import { initBackend, loadLabels, loadSignModel, warmUp } from '../lib/model.js'

/**
 * Loads TensorFlow.js, the label list and the sign model (trained if present, else the
 * placeholder). The model and labels live in refs for the render loop.
 */
export function useSignModel() {
  const modelRef = useRef(null)
  const labelsRef = useRef([])
  const [state, setState] = useState({ status: 'loading', source: null, backend: null, error: '' })

  useEffect(() => {
    let cancelled = false

    async function init() {
      let model = null
      try {
        const backend = await initBackend()
        const labels = await loadLabels()
        const loaded = await loadSignModel(labels)
        model = loaded.model
        await warmUp(model)

        if (cancelled) {
          model.dispose()
          return
        }
        modelRef.current = model
        labelsRef.current = labels
        setState({ status: 'ready', source: loaded.source, backend, error: '' })
      } catch (err) {
        model?.dispose()
        if (cancelled) return
        console.error('Sign model init failed:', err)
        setState({
          status: 'error',
          source: null,
          backend: null,
          error: `The sign model could not load. ${err?.message ?? ''}`.trim(),
        })
      }
    }

    init()

    return () => {
      cancelled = true
      modelRef.current?.dispose()
      modelRef.current = null
    }
  }, [])

  return { modelRef, labelsRef, ...state }
}
