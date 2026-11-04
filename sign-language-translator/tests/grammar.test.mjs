import test from 'node:test'
import assert from 'node:assert/strict'
import { synthesizeLocalSentence } from '../src/lib/grammar.js'

test('synthesizeLocalSentence handles empty or idle tokens', () => {
  assert.equal(synthesizeLocalSentence([]), '')
  assert.equal(synthesizeLocalSentence(['_IDLE', '_idle']), '')
})

test('synthesizeLocalSentence formats single signs cleanly', () => {
  assert.equal(synthesizeLocalSentence(['YES']), 'Yes.')
  assert.equal(synthesizeLocalSentence(['NO']), 'No.')
  assert.equal(synthesizeLocalSentence(['HELP']), 'Please help me.')
  assert.equal(synthesizeLocalSentence(['HELLO']), 'Hello!')
  assert.equal(synthesizeLocalSentence(['THANK_YOU']), 'Thank you!')
  assert.equal(synthesizeLocalSentence(['COMPUTER']), 'Computer.')
})

test('synthesizeLocalSentence deduplicates adjacent repetitions', () => {
  assert.equal(synthesizeLocalSentence(['HELP', 'HELP', 'COMPUTER']), 'Please help with the computer.')
})

test('synthesizeLocalSentence constructs conversational sentences', () => {
  assert.equal(synthesizeLocalSentence(['HELLO', 'NICE', 'MEET', 'YOU']), 'Hello, nice to meet you!')
  assert.equal(synthesizeLocalSentence(['I', 'WANT', 'WATER']), 'I want water.')
  assert.equal(synthesizeLocalSentence(['PLEASE', 'HELP', 'ME']), 'Please help me.')
})

test('synthesizeLocalSentence constructs subject-verb-object sentences', () => {
  const s = synthesizeLocalSentence(['MOTHER', 'LOVE', 'FAMILY'])
  assert.equal(s, 'Mother loves family.')
})

test('synthesizeLocalSentence constructs verb + object sentences', () => {
  assert.equal(synthesizeLocalSentence(['HELP', 'COMPUTER']), 'Please help with the computer.')
  assert.equal(synthesizeLocalSentence(['DRINK', 'WATER']), "Let's drink water.")
})

test('synthesizeLocalSentence handles question words', () => {
  const s = synthesizeLocalSentence(['WHAT', 'COMPUTER'])
  assert.equal(s, 'What about the computer?')
})

test('synthesizeLocalSentence prefixes affirmative and polite signs', () => {
  const s = synthesizeLocalSentence(['YES', 'BROTHER', 'HELP'])
  assert.match(s, /^Yes, /)
  const p = synthesizeLocalSentence(['PLEASE', 'HELP'])
  assert.equal(p, 'Please help me.')
})
