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
  inferenceStride: 3,   // Run model every 3 frames (~10 inferences per sec for fast motion)
  minHandPresence: 0.35, // Skip inference if hands visible in <35% of frames (more forgiving)

  // --- Prediction Gating ---
  minConfidence: 0.45,  // Responsive threshold (45% vs 60%) to catch fast/informal signs
  votesRequired: 2,     // 2 consecutive agreeing inferences
  cooldownMs: 700,      // 700ms cooldown (down from 1200ms) for natural sentence pacing
  idleLabel: '_idle',

  modelUrl: `${BASE_URL}models/asl/model.json?v=50`,
  labelsUrl: `${BASE_URL}models/asl/labels.json?v=50`,
}
