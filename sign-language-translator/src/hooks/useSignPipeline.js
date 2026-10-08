import { useEffect, useRef } from 'react'
import { CONFIG, FEATURE_DIM, WINDOW_SIZE } from '../config.js'
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

    const buffer = new FrameBuffer(WINDOW_SIZE, FEATURE_DIM)
    bufferRef.current = buffer
    const frame = new Float32Array(FEATURE_DIM)

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
        const model = modelRef.current
        if (!model) return
        const probs = await predictSequence(model, buffer.snapshot())
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
      // Note: We skip drawing the landmarks here as the focus is on the feature extraction pipeline
      // and we uninstalled tasks-vision (DrawingUtils).
      
      const hands = encodeFrame(results, frame)
      buffer.push(frame, hands > 0)
      stats.handsVisible = hands
      buffer.timeline(stats.timeline)

      framesSinceInference++
      if (buffer.isFull && framesSinceInference >= CONFIG.inferenceStride) {
        if (buffer.presenceRatio() < CONFIG.minHandPresence) {
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

          // Trigger asynchronous processing
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
  }, [enabled, videoRef, canvasRef, holisticRef, modelRef, labelsRef])

  return { statsRef }
}
