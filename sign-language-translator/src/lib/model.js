import { CONFIG, WINDOW_SIZE, NUM_LANDMARKS, COORDINATES_PER_LANDMARK } from '../config.js'


export async function initBackend() {
  return 'tfjs'
}

export async function loadLabels() {
  const res = await fetch(CONFIG.labelsUrl)
  if (!res.ok) throw new Error(`Could not load ${CONFIG.labelsUrl} (HTTP ${res.status}).`)
  const labels = await res.json().catch(() => {
    throw new Error(`${CONFIG.labelsUrl} is not valid JSON.`)
  })
  if (!Array.isArray(labels) || labels.length < 2 || !labels.every((l) => typeof l === 'string')) {
    throw new Error('labels.json must be an array of at least two strings.')
  }
  return labels
}

export async function loadSignModel(labels) {
  try {
    const model = await window.tf.loadLayersModel(CONFIG.modelUrl)
    return { model, source: 'trained' }
  } catch (err) {
    throw new Error(`Failed to load ${CONFIG.modelUrl}: ${err?.message}`)
  }
}

export async function warmUp(model) {
  const inputTensor = window.tf.zeros([1, WINDOW_SIZE, NUM_LANDMARKS, COORDINATES_PER_LANDMARK], 'float32')
  const out = model.predict(inputTensor)
  out.dataSync()
  inputTensor.dispose()
  out.dispose()
}

/**
 * Predicts the ASL sign for a given temporal window of frames.
 * 
 * @param {Object} model The loaded TensorFlow.js model.
 * @param {Float32Array} sequence A flat array containing 30 frames of 1629 features.
 * @returns {Promise<Float32Array>} The softmax probabilities for each label.
 * 
 * Note: The flat sequence is reshaped into a tensor of shape [1, 30, 543, 3]
 * ([1, WINDOW_SIZE, NUM_LANDMARKS, COORDINATES_PER_LANDMARK]) before being fed to the model.
 */
export async function predictSequence(model, sequence) {
  const inputTensor = window.tf.tensor(sequence, [1, WINDOW_SIZE, NUM_LANDMARKS, COORDINATES_PER_LANDMARK], 'float32')
  const outputTensor = model.predict(inputTensor)
  try {
    return outputTensor.dataSync()
  } finally {
    inputTensor.dispose()
    outputTensor.dispose()
  }
}
