import { useEffect, useRef, useState } from 'react'
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision'
import { CONFIG, NUM_HANDS } from '../config.js'

// Injected by vite.config.js from the installed package, so JS and WASM versions always match.
const VERSION = typeof __MEDIAPIPE_VERSION__ === 'string' ? __MEDIAPIPE_VERSION__ : 'latest'
const WASM_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VERSION}/wasm`

/**
 * Creates the MediaPipe HandLandmarker once and exposes it through a ref, so the
 * render loop can read it every frame without going through React state.
 */
export function useHandLandmarker() {
  const landmarkerRef = useRef(null)
  const [state, setState] = useState({ status: 'loading', error: '' })

  useEffect(() => {
    let cancelled = false

    async function init() {
      try {
        const vision = await FilesetResolver.forVisionTasks(WASM_URL)
        const create = (delegate) =>
          HandLandmarker.createFromOptions(vision, {
            baseOptions: { modelAssetPath: CONFIG.handLandmarkerUrl, delegate },
            runningMode: 'VIDEO',
            numHands: NUM_HANDS,
          })

        let landmarker
        try {
          landmarker = await create('GPU')
        } catch (gpuError) {
          console.warn('GPU delegate unavailable, falling back to CPU:', gpuError)
          landmarker = await create('CPU')
        }

        if (cancelled) {
          landmarker.close()
          return
        }
        landmarkerRef.current = landmarker
        setState({ status: 'ready', error: '' })
      } catch (err) {
        if (cancelled) return
        console.error('HandLandmarker init failed:', err)
        setState({
          status: 'error',
          error: `Hand tracking could not load. Check your connection (the model downloads once), then reload. ${err?.message ?? ''}`.trim(),
        })
      }
    }

    init()

    return () => {
      cancelled = true
      landmarkerRef.current?.close()
      landmarkerRef.current = null
    }
  }, [])

  return { landmarkerRef, ...state }
}
