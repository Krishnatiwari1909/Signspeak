/**
 * Encodes MediaPipe Holistic results into feature vectors for sign recognition models.
 */

/**
 * Encodes 543 landmarks for Google's GISLR competition model:
 * 1. Face: 468 landmarks (indices 0..467)
 * 2. Left Hand: 21 landmarks (indices 468..488)
 * 3. Pose: 33 landmarks (indices 489..521)
 * 4. Right Hand: 21 landmarks (indices 522..542)
 * Total: 543 landmarks * 3 coordinates = 1629 floats per frame.
 * Missing landmarks (e.g. hand out of frame) are set to NaN as expected by GISLR models.
 */
export function encodeFrameGISLR(results, out) {
  out.fill(Number.NaN)
  if (!results) return 0

  let handsCount = 0

  // 1. Face (first 468 landmarks)
  if (results.faceLandmarks) {
    const count = Math.min(results.faceLandmarks.length, 468)
    for (let i = 0; i < count; i++) {
      const lm = results.faceLandmarks[i]
      const offset = i * 3
      out[offset] = lm.x
      out[offset + 1] = lm.y
      out[offset + 2] = lm.z || 0.0
    }
  }

  // 2. Left Hand (21 landmarks)
  if (results.leftHandLandmarks && results.leftHandLandmarks.length >= 21) {
    handsCount++
    for (let i = 0; i < 21; i++) {
      const lm = results.leftHandLandmarks[i]
      const offset = (468 + i) * 3
      out[offset] = lm.x
      out[offset + 1] = lm.y
      out[offset + 2] = lm.z || 0.0
    }
  }

  // 3. Pose (33 landmarks)
  if (results.poseLandmarks && results.poseLandmarks.length >= 33) {
    for (let i = 0; i < 33; i++) {
      const lm = results.poseLandmarks[i]
      const offset = (489 + i) * 3
      out[offset] = lm.x
      out[offset + 1] = lm.y
      out[offset + 2] = lm.z || 0.0
    }
  }

  // 4. Right Hand (21 landmarks)
  if (results.rightHandLandmarks && results.rightHandLandmarks.length >= 21) {
    handsCount++
    for (let i = 0; i < 21; i++) {
      const lm = results.rightHandLandmarks[i]
      const offset = (522 + i) * 3
      out[offset] = lm.x
      out[offset + 1] = lm.y
      out[offset + 2] = lm.z || 0.0
    }
  }

  return handsCount
}

/**
 * Encodes 135 landmarks normalized relative to shoulder midpoint and scale:
 * 1. Pose (33)
 * 2. Left Hand (21)
 * 3. Right Hand (21)
 * 4. Face (60)
 * Total: 135 landmarks * 3 coordinates = 405 floats per frame.
 */
export function encodeFrameConversational(results, out) {
  out.fill(0)
  if (!results) return 0

  let offset = 0
  let handsCount = 0

  // Calculate shoulder midpoint as origin (0, 0, 0) and standardized scale
  let originX = 0.5
  let originY = 0.5
  let originZ = 0.0
  let scale = 1.0

  if (results.poseLandmarks && results.poseLandmarks.length >= 13) {
    const lShoulder = results.poseLandmarks[11]
    const rShoulder = results.poseLandmarks[12]
    originX = (lShoulder.x + rShoulder.x) / 2.0
    originY = (lShoulder.y + rShoulder.y) / 2.0
    originZ = (lShoulder.z + rShoulder.z) / 2.0

    const dx = rShoulder.x - lShoulder.x
    const dy = rShoulder.y - lShoulder.y
    const dz = (rShoulder.z || 0) - (lShoulder.z || 0)
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
    if (dist > 0.05) {
      scale = dist / 0.4
    }
  }

  // 1. Pose (33 landmarks)
  if (results.poseLandmarks) {
    for (const lm of results.poseLandmarks) {
      out[offset++] = (lm.x - originX) / scale
      out[offset++] = (lm.y - originY) / scale
      out[offset++] = ((lm.z || 0) - originZ) / scale
    }
  } else {
    offset += 33 * 3
  }

  // 2. Left Hand (21 landmarks)
  if (results.leftHandLandmarks) {
    handsCount++
    for (const lm of results.leftHandLandmarks) {
      out[offset++] = (lm.x - originX) / scale
      out[offset++] = (lm.y - originY) / scale
      out[offset++] = ((lm.z || 0) - originZ) / scale
    }
  } else {
    offset += 21 * 3
  }

  // 3. Right Hand (21 landmarks)
  if (results.rightHandLandmarks) {
    handsCount++
    for (const lm of results.rightHandLandmarks) {
      out[offset++] = (lm.x - originX) / scale
      out[offset++] = (lm.y - originY) / scale
      out[offset++] = ((lm.z || 0) - originZ) / scale
    }
  } else {
    offset += 21 * 3
  }

  // 4. Face (First 60 landmarks)
  if (results.faceLandmarks) {
    const count = Math.min(results.faceLandmarks.length, 60)
    for (let i = 0; i < count; i++) {
      const lm = results.faceLandmarks[i]
      out[offset++] = (lm.x - originX) / scale
      out[offset++] = (lm.y - originY) / scale
      out[offset++] = ((lm.z || 0) - originZ) / scale
    }
    if (count < 60) {
      offset += (60 - count) * 3
    }
  } else {
    offset += 60 * 3
  }

  return handsCount
}

/**
 * Dispatches frame encoding to the appropriate feature extractor based on output length or model type.
 */
export function encodeFrame(results, out, modelType) {
  if (modelType === 'onnx' || (!modelType && out.length === 1629)) {
    return encodeFrameGISLR(results, out)
  }
  return encodeFrameConversational(results, out)
}
