import { useEffect, useRef } from 'react'
import { DrawingUtils, HandLandmarker } from '@mediapipe/tasks-vision'
import { CONFIG, FEATURE_DIM, WINDOW_SIZE } from '../config.js'
import { encodeFrame } from '../lib/features.js'
import { FrameBuffer } from '../lib/FrameBuffer.js'
import { predictSequence } from '../lib/model.js'
import { argmax } from '../lib/predictions.js'

const LINE = { color: '#7fd8ff', lineWidth: 4 }
const DOT = { color: '#ffffff', fillColor: '#0e1126', lineWidth: 2, radius: 4 }

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

/**
 * The real-time loop. Per sampled frame:
 *   hidden <video> -> HandLandmarker -> canvas (frame + skeleton)
 *                                    -> feature vector -> rolling buffer (ref)
 * Every `inferenceStride` frames, once the buffer is full, the window is copied out and
 * classified ASYNCHRONOUSLY: the loop keeps drawing while TensorFlow.js works, and at most
 * one inference is ever in flight.
 *
 * Nothing per-frame is stored in React state. Telemetry goes to `statsRef`, and a prediction
 * reaches React only through the `onPrediction` callback.
 */
export function useSignPipeline({
  videoRef,
  canvasRef,
  landmarkerRef,
  modelRef,
  labelsRef,
  enabled,
  onPrediction,
}) {
  const statsRef = useRef(createStats())

  // Latest callback in a ref so changing it never restarts the loop.
  const onPredictionRef = useRef(onPrediction)
  useEffect(() => {
    onPredictionRef.current = onPrediction
  }, [onPrediction])

  useEffect(() => {
    if (!enabled) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const drawing = new DrawingUtils(ctx)
    const stats = statsRef.current

    const buffer = new FrameBuffer(WINDOW_SIZE, FEATURE_DIM)
    const frame = new Float32Array(FEATURE_DIM) // reused every frame

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

    const loop = () => {
      rafId = requestAnimationFrame(loop)

      const landmarker = landmarkerRef.current
      if (!landmarker || video.readyState < 2) return

      // Sample at a fixed rate (~30 Hz) so the window always spans about one second, whatever
      // the camera or display frame rate. The 0.85 factor absorbs rAF timing jitter.
      const now = performance.now()
      if (now - lastSample < CONFIG.sampleIntervalMs * 0.85) return
      // Never process the same camera frame twice.
      if (video.currentTime === lastVideoTime) return
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

      // 1. Detect hands (synchronous WASM/GPU call, a few ms).
      const result = landmarker.detectForVideo(video, now)

      // 2. Draw the camera frame, then the skeleton on top of it.
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      for (const landmarks of result.landmarks) {
        drawing.drawConnectors(landmarks, HandLandmarker.HAND_CONNECTIONS, LINE)
        drawing.drawLandmarks(landmarks, DOT)
      }

      // 3. Encode the frame and push it into the rolling window.
      const hands = encodeFrame(result, frame, canvas.width / canvas.height)
      buffer.push(frame, hands > 0)
      stats.handsVisible = hands
      buffer.timeline(stats.timeline)

      // 4. When the window is full, classify it every few frames (async, non-blocking).
      framesSinceInference++
      if (buffer.isFull && framesSinceInference >= CONFIG.inferenceStride) {
        if (buffer.presenceRatio() < CONFIG.minHandPresence) {
          framesSinceInference = 0
          onPredictionRef.current?.(null, now) // "nothing to translate": lets repeats re-arm
        } else if (!inferring && modelRef.current) {
          framesSinceInference = 0
          runInference()
        }
      }
    }

    rafId = requestAnimationFrame(loop)

    return () => {
      disposed = true
      cancelAnimationFrame(rafId)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
  }, [enabled, videoRef, canvasRef, landmarkerRef, modelRef, labelsRef])

  return { statsRef }
}
