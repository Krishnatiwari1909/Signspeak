// Central tuning knobs. Times are in milliseconds.
// Note: WINDOW_SIZE and FEATURE_DIM define the model's input shape [WINDOW_SIZE, FEATURE_DIM].
// A trained model must be exported with exactly this input shape (see README).

const BASE_URL = import.meta.env?.BASE_URL ?? '/'

export const WINDOW_SIZE = 30 // frames in the rolling temporal window (~1 s at 30 fps)
export const NUM_HANDS = 2
export const LANDMARKS_PER_HAND = 21
// Per hand: 21 landmarks x (x, y, z) shape features + wrist position (x, y)
export const FEATURES_PER_HAND = LANDMARKS_PER_HAND * 3 + 2
export const FEATURE_DIM = FEATURES_PER_HAND * NUM_HANDS

export const CONFIG = {
  // Sampling: the window always spans ~1 s of motion regardless of camera frame rate.
  sampleIntervalMs: 33,
  // Run the model every N sampled frames once the window is full (5 -> ~6 predictions/s).
  inferenceStride: 5,
  // Skip inference if fewer than this share of the window's frames contained a hand.
  minHandPresence: 0.4,

  // Turning predictions into words
  minConfidence: 0.8, // initial value of the UI slider
  votesRequired: 3, // consecutive agreeing predictions needed before a word is committed
  cooldownMs: 1200, // silence after a committed word (a bit longer than the window)
  idleLabel: '_idle', // label the model uses for "no sign"

  handLandmarkerUrl:
    'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
  modelUrl: `${BASE_URL}models/asl/model.json`,
  labelsUrl: `${BASE_URL}models/asl/labels.json`,
}
