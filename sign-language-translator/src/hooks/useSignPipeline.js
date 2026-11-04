import { useEffect, useRef } from 'react'
import { CONFIG, WINDOW_SIZE } from '../config.js'
import { encodeFrame } from '../lib/features.js'
import { FrameBuffer } from '../lib/FrameBuffer.js'
import { predictSequence } from '../lib/model.js'
import { top2Margin } from '../lib/predictions.js'

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
 * Checks whether at least one active hand is raised within the natural signing space
 * (chest / neck / face area), rather than resting low down on a desk or in the lap.
 */
function isHandsInSigningSpace(results) {
  if (!results) return false
  const hasHands = Boolean(results.leftHandLandmarks || results.rightHandLandmarks)
  if (!hasHands) return false

  if (results.poseLandmarks && results.poseLandmarks.length >= 17) {
    const lShoulder = results.poseLandmarks[11]
    const rShoulder = results.poseLandmarks[12]
    if (lShoulder && rShoulder) {
      const shoulderY = (lShoulder.y + rShoulder.y) / 2.0
      // Check hand wrist coordinates (landmark 0 of hands)
      const lWristY = results.leftHandLandmarks ? results.leftHandLandmarks[0].y : 1.0
      const rWristY = results.rightHandLandmarks ? results.rightHandLandmarks[0].y : 1.0

      // In normalized coords, y increases downward. Hands below shoulder + 0.42 are resting in lap/desk.
      const lActive = results.leftHandLandmarks && lWristY < shoulderY + 0.42
      const rActive = results.rightHandLandmarks && rWristY < shoulderY + 0.42
      return Boolean(lActive || rActive)
    }
  }
  return true
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

    // Hand motion tracking to reject resting/stationary hands
    let lastRightX = -1
    let lastRightY = -1
    let lastLeftX = -1
    let lastLeftY = -1
    let smoothedMotion = 0
    let lastResults = null

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

        const { best, bestProb, margin } = top2Margin(probs)
        const minConf = activeConfig.minConfidence ?? CONFIG.minConfidence
        const minMargin = activeConfig.minMargin ?? CONFIG.minMargin ?? 0.06

        // Check if hand is in signing space and has active gesture motion
        const inSigningSpace = isHandsInSigningSpace(lastResults)
        const isMoving = smoothedMotion > 0.003

        if (inSigningSpace && isMoving && bestProb >= minConf && margin >= minMargin) {
          onPredictionRef.current?.(
            { label: labelsRef.current[best], confidence: bestProb, margin, probs },
            performance.now()
          )
        } else {
          onPredictionRef.current?.(null, performance.now())
        }
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
      lastResults = results

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

      // Track wrist movement across frames to estimate hand velocity
      let currentMotion = 0
      if (results.rightHandLandmarks && results.rightHandLandmarks.length > 0) {
        const rw = results.rightHandLandmarks[0]
        if (lastRightX >= 0 && lastRightY >= 0) {
          const dx = rw.x - lastRightX
          const dy = rw.y - lastRightY
          currentMotion = Math.max(currentMotion, Math.sqrt(dx * dx + dy * dy))
        }
        lastRightX = rw.x
        lastRightY = rw.y
      } else {
        lastRightX = -1
        lastRightY = -1
      }

      if (results.leftHandLandmarks && results.leftHandLandmarks.length > 0) {
        const lw = results.leftHandLandmarks[0]
        if (lastLeftX >= 0 && lastLeftY >= 0) {
          const dx = lw.x - lastLeftX
          const dy = lw.y - lastLeftY
          currentMotion = Math.max(currentMotion, Math.sqrt(dx * dx + dy * dy))
        }
        lastLeftX = lw.x
        lastLeftY = lw.y
      } else {
        lastLeftX = -1
        lastLeftY = -1
      }

      // Smooth peak motion with exponential decay: retains gesture peak for ~15 frames
      smoothedMotion = Math.max(smoothedMotion * 0.88, currentMotion)
      
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
