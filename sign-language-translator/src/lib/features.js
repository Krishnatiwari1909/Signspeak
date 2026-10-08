/**
 * Extracts 135 landmarks normalized relative to the shoulder midpoint (matching extract_optimized.py):
 * 1. Pose (33)
 * 2. Left Hand (21)
 * 3. Right Hand (21)
 * 4. Face (60)
 * Total: 135 landmarks * 3 coordinates = 405 values per frame.
 */
export function encodeFrame(results, out) {
  out.fill(0)
  if (!results) return 0

  let offset = 0
  let handsCount = 0

  // Calculate shoulder midpoint as origin (0, 0, 0)
  let originX = 0.5
  let originY = 0.5
  let originZ = 0.0

  if (results.poseLandmarks && results.poseLandmarks.length >= 13) {
    const lShoulder = results.poseLandmarks[11]
    const rShoulder = results.poseLandmarks[12]
    originX = (lShoulder.x + rShoulder.x) / 2.0
    originY = (lShoulder.y + rShoulder.y) / 2.0
    originZ = (lShoulder.z + rShoulder.z) / 2.0
  }

  // 1. Pose (33 landmarks)
  if (results.poseLandmarks) {
    for (const lm of results.poseLandmarks) {
      out[offset++] = lm.x - originX
      out[offset++] = lm.y - originY
      out[offset++] = lm.z - originZ
    }
  } else {
    offset += 33 * 3
  }

  // 2. Left Hand (21 landmarks)
  if (results.leftHandLandmarks) {
    handsCount++
    for (const lm of results.leftHandLandmarks) {
      out[offset++] = lm.x - originX
      out[offset++] = lm.y - originY
      out[offset++] = lm.z - originZ
    }
  } else {
    offset += 21 * 3
  }

  // 3. Right Hand (21 landmarks)
  if (results.rightHandLandmarks) {
    handsCount++
    for (const lm of results.rightHandLandmarks) {
      out[offset++] = lm.x - originX
      out[offset++] = lm.y - originY
      out[offset++] = lm.z - originZ
    }
  } else {
    offset += 21 * 3
  }

  // 4. Face (First 60 landmarks)
  if (results.faceLandmarks) {
    const count = Math.min(results.faceLandmarks.length, 60)
    for (let i = 0; i < count; i++) {
      const lm = results.faceLandmarks[i]
      out[offset++] = lm.x - originX
      out[offset++] = lm.y - originY
      out[offset++] = lm.z - originZ
    }
    if (count < 60) {
      offset += (60 - count) * 3
    }
  } else {
    offset += 60 * 3
  }

  return handsCount
}