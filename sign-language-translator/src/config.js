// Central ML and application configuration. Times are in milliseconds.
const BASE_URL = import.meta.env?.BASE_URL ?? '/'

// --- Machine Learning Tensor Shapes ---
// Holistic: Face (60) + LeftHand (21) + Pose (33) + RightHand (21) = 135 landmarks
export const NUM_LANDMARKS = 135
export const COORDINATES_PER_LANDMARK = 3 // (x, y, z)
export const FEATURE_DIM = NUM_LANDMARKS * COORDINATES_PER_LANDMARK // 405 floats per frame
export const WINDOW_SIZE = 30 // Frames in the rolling temporal window (~1 s at 30 fps)

export const CONFIG = {
  // --- Pipeline Sampling ---
  sampleIntervalMs: 33, // Target ~30Hz sampling
  inferenceStride: 5,   // Run model every 5 frames (~6 inferences per sec)
  minHandPresence: 0.4, // Skip inference if hands visible in <40% of frames

  // --- Prediction Gating ---
  minConfidence: 0.8,
  votesRequired: 3,
  cooldownMs: 1200,
  idleLabel: '_idle',

  modelUrl: `${BASE_URL}models/asl/model.json?v=23`,
  labelsUrl: `${BASE_URL}models/asl/labels.json?v=23`,
}
