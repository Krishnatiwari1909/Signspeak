import { FEATURES_PER_HAND, LANDMARKS_PER_HAND, NUM_HANDS } from '../config.js'

/*
 * Feature layout for ONE frame (Float32Array of FEATURE_DIM values):
 *
 *   [ hand slot 0 | hand slot 1 ]      slot 0 = "Left" hand, slot 1 = "Right" hand
 *
 * Each hand slot holds FEATURES_PER_HAND (65) values:
 *   0..62   21 landmarks x (x, y, z), relative to the wrist and divided by the hand's size
 *           (wrist -> middle-finger knuckle distance). This describes hand SHAPE and is
 *           invariant to where the hand is and how far it is from the camera.
 *   63..64  wrist position (x, y) in normalized image coordinates [0..1]. This keeps
 *           WHERE the sign happens, which matters for many ASL signs.
 *
 * A missing hand is all zeros. Training data must use the same convention.
 */

const WRIST = 0
const MIDDLE_FINGER_MCP = 9
const MIN_SCALE = 1e-6

function encodeHand(landmarks, out, offset, aspect) {
  const wrist = landmarks[WRIST]
  const ref = landmarks[MIDDLE_FINGER_MCP]
  // MediaPipe's x and z are normalized by image width and y by image height, so scale x and z
  // by the aspect ratio to put all three axes in the same units before measuring anything.
  const scale = Math.max(
    Math.hypot((ref.x - wrist.x) * aspect, ref.y - wrist.y, (ref.z - wrist.z) * aspect),
    MIN_SCALE
  )

  let o = offset
  for (let i = 0; i < LANDMARKS_PER_HAND; i++) {
    const p = landmarks[i]
    out[o++] = ((p.x - wrist.x) * aspect) / scale
    out[o++] = (p.y - wrist.y) / scale
    out[o++] = ((p.z - wrist.z) * aspect) / scale
  }
  out[o++] = wrist.x
  out[o] = wrist.y
}

/** Decide which slot (0 or 1) each detected hand goes in. */
function assignSlots(entries) {
  if (entries.length === 1) return [entries[0].label === 'Right' ? 1 : 0]

  const slots = entries.map((e) => (e.label === 'Left' ? 0 : 1))
  if (slots[0] !== slots[1]) return slots

  // Both hands got the same (or an unknown) label: fall back to screen position so the
  // assignment is at least stable from frame to frame.
  return entries[0].landmarks[WRIST].x <= entries[1].landmarks[WRIST].x ? [0, 1] : [1, 0]
}

/**
 * Encode a HandLandmarker result into `out` (length FEATURE_DIM), overwriting it.
 * @param result   HandLandmarkerResult
 * @param out      Float32Array(FEATURE_DIM), reused across frames to avoid allocations
 * @param aspect   video width / height
 * @returns        number of hands encoded (0, 1 or 2)
 */
export function encodeFrame(result, out, aspect = 1) {
  out.fill(0)
  const all = result?.landmarks ?? []
  if (all.length === 0) return 0

  // Newer versions call this `handedness`; older ones `handednesses`.
  const handedness = result.handedness ?? result.handednesses ?? []
  const count = Math.min(all.length, NUM_HANDS)

  const entries = []
  for (let i = 0; i < count; i++) {
    entries.push({ landmarks: all[i], label: handedness[i]?.[0]?.categoryName })
  }

  const slots = assignSlots(entries)
  for (let k = 0; k < count; k++) {
    encodeHand(entries[k].landmarks, out, slots[k] * FEATURES_PER_HAND, aspect)
  }
  return count
}
