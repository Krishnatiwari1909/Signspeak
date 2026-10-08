import test from 'node:test'
import assert from 'node:assert/strict'
import { FEATURE_DIM, NUM_LANDMARKS, WINDOW_SIZE } from '../src/config.js'
import { encodeFrame } from '../src/lib/features.js'
import { FrameBuffer } from '../src/lib/FrameBuffer.js'
import { createPredictionGate } from '../src/lib/predictionGate.js'
import { argmax, prettyLabel, topK } from '../src/lib/predictions.js'

/* ---------- helpers ---------- */

function makeLandmarks(count, offset = 0) {
  const landmarks = []
  for (let i = 0; i < count; i++) {
    landmarks.push({ x: 0.5 + offset, y: 0.5 + offset, z: 0.0 + offset })
  }
  return landmarks
}

/* ---------- FrameBuffer ---------- */

test('FrameBuffer returns a chronological snapshot after wrapping', () => {
  const buf = new FrameBuffer(4, 2)
  for (let i = 0; i < 6; i++) buf.push([i, i], i % 2 === 0) // frames 0..5
  assert.equal(buf.isFull, true)
  assert.deepEqual(Array.from(buf.snapshot()), [2, 2, 3, 3, 4, 4, 5, 5])
  // Window holds frames 2..5; hands present on 2 and 4 -> 50%
  assert.equal(buf.presenceRatio(), 0.5)
})

test('FrameBuffer zero-pads a partially filled snapshot at the front', () => {
  const buf = new FrameBuffer(4, 2)
  buf.push([7, 7], true)
  buf.push([8, 8], true)
  assert.equal(buf.isFull, false)
  assert.deepEqual(Array.from(buf.snapshot()), [0, 0, 0, 0, 7, 7, 8, 8])
})

test('FrameBuffer timeline is chronological and marks hands', () => {
  const buf = new FrameBuffer(4, 1)
  const out = new Uint8Array(4)
  buf.push([1], true)
  buf.push([2], false)
  assert.deepEqual(Array.from(buf.timeline(out)), [0, 0, 2, 1])
  buf.push([3], true)
  buf.push([4], true)
  buf.push([5], false) // wraps: window is now frames 2..5
  assert.deepEqual(Array.from(buf.timeline(out)), [1, 2, 2, 1])
})

test('FrameBuffer.clear empties the window', () => {
  const buf = new FrameBuffer(3, 1)
  buf.push([1], true)
  buf.clear()
  assert.equal(buf.size, 0)
  assert.equal(buf.presenceRatio(), 0)
})

/* ---------- feature encoding ---------- */

test('feature dimensions are consistent', () => {
  assert.equal(NUM_LANDMARKS, 135)
  assert.equal(FEATURE_DIM, 405)
  assert.equal(WINDOW_SIZE, 30)
})

test('encodeFrame returns 0 and zeros when no hands are visible', () => {
  const out = new Float32Array(FEATURE_DIM).fill(9)
  assert.equal(encodeFrame({}, out), 0)
  assert.ok(out.every((v) => v === 0))
})

test('encodeFrame centers landmarks around the shoulders', () => {
  const out = new Float32Array(FEATURE_DIM)
  const pose = makeLandmarks(33)
  // Shift shoulders to 0.6, 0.6
  pose[11] = { x: 0.6, y: 0.6, z: 0.0 }
  pose[12] = { x: 0.6, y: 0.6, z: 0.0 }

  const lHand = makeLandmarks(21, 0.2) // x=0.7
  const rHand = makeLandmarks(21, -0.2) // x=0.3
  const face = makeLandmarks(60, 0) // x=0.5

  const handsCount = encodeFrame(
    {
      poseLandmarks: pose,
      leftHandLandmarks: lHand,
      rightHandLandmarks: rHand,
      faceLandmarks: face,
    },
    out
  )

  assert.equal(handsCount, 2)

  // Origin should be 0.6
  // lHand index in out: Pose is 33*3=99. lHand starts at 99.
  // First lHand x should be 0.7 - 0.6 = 0.1. (with floating point tolerance)
  assert.ok(Math.abs(out[99] - 0.1) < 1e-5)
})

/* ---------- prediction gate ---------- */

function makeGate(overrides = {}) {
  const commits = []
  const gate = createPredictionGate({
    votesRequired: 3,
    cooldownMs: 1000,
    onCommit: (label) => commits.push(label),
    ...overrides,
  })
  return { gate, commits }
}

test('gate commits only after enough consecutive agreeing predictions', () => {
  const { gate, commits } = makeGate()
  gate.update('HELLO', 0.9, 0)
  gate.update('HELLO', 0.9, 100)
  assert.deepEqual(commits, [])
  gate.update('HELLO', 0.9, 200)
  assert.deepEqual(commits, ['HELLO'])
})

test('gate resets votes when the label changes or a gap appears', () => {
  const { gate, commits } = makeGate()
  gate.update('HELLO', 0.9, 0)
  gate.update('HELLO', 0.9, 100)
  gate.update('YES', 0.9, 200) // label flips
  gate.update('YES', 0.9, 300)
  gate.update(null, 0, 400) // gap
  gate.update('YES', 0.9, 500)
  gate.update('YES', 0.9, 600)
  assert.deepEqual(commits, [])
  gate.update('YES', 0.9, 700)
  assert.deepEqual(commits, ['YES'])
})

test('gate ignores everything during the cooldown', () => {
  const { gate, commits } = makeGate()
  ;[0, 100, 200].forEach((t) => gate.update('HELLO', 0.9, t))
  ;[300, 400, 500, 600].forEach((t) => gate.update('YES', 0.9, t)) // inside cooldown (until 1200)
  assert.deepEqual(commits, ['HELLO'])
})

test('gate does not repeat the same word until the signer pauses', () => {
  const { gate, commits } = makeGate()
  ;[0, 100, 200].forEach((t) => gate.update('HELLO', 0.9, t))
  ;[1500, 1600, 1700, 1800].forEach((t) => gate.update('HELLO', 0.9, t)) // still lingering
  assert.deepEqual(commits, ['HELLO'])
  gate.update(null, 0, 1900) // pause
  ;[2000, 2100, 2200].forEach((t) => gate.update('HELLO', 0.9, t))
  assert.deepEqual(commits, ['HELLO', 'HELLO'])
})

test('gate allows a different word right after the cooldown without a pause', () => {
  const { gate, commits } = makeGate()
  ;[0, 100, 200].forEach((t) => gate.update('HELLO', 0.9, t))
  ;[1500, 1600, 1700].forEach((t) => gate.update('YES', 0.9, t))
  assert.deepEqual(commits, ['HELLO', 'YES'])
})

/* ---------- prediction helpers ---------- */

test('argmax, topK and prettyLabel', () => {
  const probs = new Float32Array([0.1, 0.6, 0.3])
  assert.equal(argmax(probs), 1)
  assert.deepEqual(topK(probs, ['A', 'B', 'C'], 2).map((g) => g.label), ['B', 'C'])
  assert.equal(prettyLabel('THANK_YOU'), 'Thank you')
  assert.equal(prettyLabel(''), '')
})
