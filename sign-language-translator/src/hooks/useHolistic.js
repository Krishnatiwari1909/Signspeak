import { useEffect, useRef, useState } from 'react'

export function useHolistic() {
  const holisticRef = useRef(null)
  const [state, setState] = useState({ status: 'loading', error: '' })

  useEffect(() => {
    let cancelled = false

    async function init() {
      try {
        const holistic = new window.Holistic({
          locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/holistic/${file}`
          },
        })

        holistic.setOptions({
          modelComplexity: 1,
          smoothLandmarks: true,
          enableSegmentation: false,
          smoothSegmentation: true,
          refineFaceLandmarks: true,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        })

        await holistic.initialize()

        if (cancelled) {
          holistic.close()
          return
        }

        holisticRef.current = holistic
        setState({ status: 'ready', error: '' })
      } catch (err) {
        if (cancelled) return
        console.error('Holistic init failed:', err)
        setState({
          status: 'error',
          error: `Holistic tracking could not load. ${err?.message ?? ''}`.trim(),
        })
      }
    }

    init()

    return () => {
      cancelled = true
      holisticRef.current?.close()
      holisticRef.current = null
    }
  }, [])

  return { holisticRef, ...state }
}
