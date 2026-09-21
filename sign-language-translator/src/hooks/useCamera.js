import { useEffect, useRef, useState } from 'react'

const CONSTRAINTS = {
  video: {
    width: { ideal: 640 },
    height: { ideal: 480 },
    frameRate: { ideal: 30 },
    facingMode: 'user',
  },
  audio: false,
}

function describeError(err) {
  if (err?.name === 'NotAllowedError') {
    return 'Camera permission was denied. Allow camera access in your browser settings, then reload.'
  }
  if (err?.name === 'NotFoundError') return 'No camera was found on this device.'
  if (err?.name === 'NotReadableError') return 'The camera is in use by another app. Close it and reload.'
  return err?.message || 'Could not start the camera.'
}

/**
 * Starts the webcam and attaches it to a <video> element.
 * The caller renders that element (hidden) and passes `videoRef` to it.
 */
export function useCamera() {
  const videoRef = useRef(null)
  const [state, setState] = useState({ status: 'loading', error: '' })

  useEffect(() => {
    const video = videoRef.current
    let stream = null
    let cancelled = false

    async function start() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('Camera access needs a modern browser on HTTPS or localhost.')
        }
        stream = await navigator.mediaDevices.getUserMedia(CONSTRAINTS)
        if (cancelled) {
          // StrictMode mounts twice in dev: release the stream we no longer need.
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        video.srcObject = stream
        await video.play()
        if (!cancelled) setState({ status: 'ready', error: '' })
      } catch (err) {
        if (cancelled) return
        console.error('Camera error:', err)
        setState({ status: 'error', error: describeError(err) })
      }
    }

    start()

    return () => {
      cancelled = true
      stream?.getTracks().forEach((t) => t.stop())
      if (video) video.srcObject = null
    }
  }, [])

  return { videoRef, ...state }
}
