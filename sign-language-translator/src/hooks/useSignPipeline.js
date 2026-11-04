import { useEffect, useRef } from 'react'
import { CONFIG, WINDOW_SIZE } from '../config.js'
import { encodeFrame } from '../lib/features.js'
import { FrameBuffer } from '../lib/FrameBuffer.js'
import { predictSequence } from '../lib/model.js'
import { argmax } from '../lib/predictions.js'

function createStats() {
  return {
    fps: 0,
    inferenceMs: 0,
    handsVisible: 0,
    timeline: new Uint8Array(WINDOW_SIZE),
    probs: null,
    labels: null,
  }
}

export function useSignPipeline({
  videoRef,
  canvasRef,
  holisticRef,
  modelRef,
  labelsRef,
  activeConfig = CONFIG,
  enabled,
  onPrediction,
}) {
  const statsRef = useRef(createStats())
  const bufferRef = useRef(null)

  const onPredictionRef = useRef(onPrediction)
  useEffect(() => {
    onPredictionRef.current = onPrediction
  }, [onPrediction])

  useEffect(() => {
    if (!enabled) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const stats = statsRef.current

    const windowSize = activeConfig.windowSize || WINDOW_SIZE
    const featureDim = activeConfig.featureDim
    const buffer = new FrameBuffer(windowSize, featureDim)
    bufferRef.current = buffer
    const frame = new Float32Array(featureDim)

    let rafId = 0
    let disposed = false
    let inferring = false
    let lastVideoTime = -1
    let lastSample = 0
    let framesSinceInference = 0

    async function runInference() {
      inferring = true
      const startedAt = performance.now()
      try {
        const modelMeta = modelRef.current
        if (!modelMeta) return
        const probs = await predictSequence(modelMeta, buffer.snapshot(), activeConfig)
        if (disposed) return

        const ms = performance.now() - startedAt
        stats.inferenceMs = stats.inferenceMs ? stats.inferenceMs * 0.8 + ms * 0.2 : ms
        stats.probs = probs
        stats.labels = labelsRef.current

        const best = argmax(probs)
        onPredictionRef.current?.(
          { label: labelsRef.current[best], confidence: probs[best], probs },
          performance.now()
        )
      } catch (err) {
        console.error('Inference failed:', err)
      } finally {
        inferring = false
      }
    }

    const holistic = holisticRef.current
    if (!holistic) return

    // Holistic is asynchronous. Register the callback.
    holistic.onResults((results) => {
      if (disposed) return

      ctx.save()
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height)

      // Lightweight hand landmark dots for real-time visual tracking feedback
      if (results.leftHandLandmarks) {
        ctx.fillStyle = '#38bdf8'
        for (const lm of results.leftHandLandmarks) {
          ctx.beginPath()
          ctx.arc(lm.x * canvas.width, lm.y * canvas.height, 3.5, 0, 2 * Math.PI)
          ctx.fill()
        }
      }
      if (results.rightHandLandmarks) {
        ctx.fillStyle = '#34d399'
        for (const lm of results.rightHandLandmarks) {
          ctx.beginPath()
          ctx.arc(lm.x * canvas.width, lm.y * canvas.height, 3.5, 0, 2 * Math.PI)
          ctx.fill()
        }
      }
      
      const hands = encodeFrame(results, frame, activeConfig.type)
      buffer.push(frame, hands > 0)
      stats.handsVisible = hands
      buffer.timeline(stats.timeline)

      framesSinceInference++
      const stride = activeConfig.inferenceStride || CONFIG.inferenceStride
      const minPresence = activeConfig.minHandPresence ?? CONFIG.minHandPresence

      if (buffer.isFull && framesSinceInference >= stride) {
        if (buffer.presenceRatio() < minPresence) {
          framesSinceInference = 0
          onPredictionRef.current?.(null, performance.now())
        } else if (!inferring && modelRef.current) {
          framesSinceInference = 0
          runInference()
        }
      }
      ctx.restore()
    })

    const loop = async () => {
      if (disposed) return

      if (video.readyState >= 2) {
        const now = performance.now()
        if (now - lastSample >= CONFIG.sampleIntervalMs * 0.85 && video.currentTime !== lastVideoTime) {
          lastVideoTime = video.currentTime

          if (lastSample) {
            const instantFps = 1000 / (now - lastSample)
            stats.fps = stats.fps ? stats.fps * 0.9 + instantFps * 0.1 : instantFps
          }
          lastSample = now

          if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
            canvas.width = video.videoWidth
            canvas.height = video.videoHeight
          }

          // Trigger asynchronous MediaPipe processing
          await holistic.send({ image: video })
        }
      }

      rafId = requestAnimationFrame(loop)
    }

    rafId = requestAnimationFrame(loop)

    return () => {
      disposed = true
      cancelAnimationFrame(rafId)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
  }, [enabled, videoRef, canvasRef, holisticRef, modelRef, labelsRef, activeConfig])

  return { statsRef }
}
