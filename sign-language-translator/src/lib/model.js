import * as tf from '@tensorflow/tfjs'
import { CONFIG, WINDOW_SIZE, NUM_LANDMARKS, COORDINATES_PER_LANDMARK } from '../config.js'

export async function initBackend() {
  await tf.ready()
  return tf.getBackend() || 'tfjs'
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
    const model = await tf.loadLayersModel(CONFIG.modelUrl)
    return { model, source: 'trained' }
  } catch (err) {
    throw new Error(`Failed to load ${CONFIG.modelUrl}: ${err?.message}`)
  }
}

export async function warmUp(model) {
  const inputTensor = tf.zeros([1, WINDOW_SIZE, NUM_LANDMARKS, COORDINATES_PER_LANDMARK], 'float32')
  const out = model.predict(inputTensor)
  out.dataSync()
  inputTensor.dispose()
  out.dispose()
}

/**
 * Predicts the ASL sign for a given temporal window of frames.
 * 
 * @param {Object} model The loaded TensorFlow.js model.
 * @param {Float32Array} sequence A flat array containing 30 frames of 405 features.
 * @returns {Promise<Float32Array>} The softmax probabilities for each label.
 */
export async function predictSequence(model, sequence) {
  const inputTensor = tf.tensor(sequence, [1, WINDOW_SIZE, NUM_LANDMARKS, COORDINATES_PER_LANDMARK], 'float32')
  const outputTensor = model.predict(inputTensor)
  try {
    return outputTensor.dataSync()
  } finally {
    inputTensor.dispose()
    outputTensor.dispose()
  }
}

