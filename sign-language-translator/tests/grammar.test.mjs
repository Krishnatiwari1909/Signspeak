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
  assert.equal(synthesizeLocalSentence(['COMPUTER']), 'Computer.')
})

test('synthesizeLocalSentence deduplicates adjacent repetitions', () => {
  assert.equal(synthesizeLocalSentence(['HELP', 'HELP', 'COMPUTER']), 'Please help with the computer.')
})

test('synthesizeLocalSentence constructs subject-verb-object sentences', () => {
  const s = synthesizeLocalSentence(['BROTHER', 'PLAY', 'BASKETBALL'])
  assert.equal(s, 'My brother play basketball.')
})

test('synthesizeLocalSentence constructs verb + object sentences', () => {
  assert.equal(synthesizeLocalSentence(['HELP', 'COMPUTER']), 'Please help with the computer.')
  assert.equal(synthesizeLocalSentence(['DRINK', 'APPLE']), "Let's drink an apple.")
})

test('synthesizeLocalSentence handles question words', () => {
  const s = synthesizeLocalSentence(['WHAT', 'COMPUTER'])
  assert.equal(s, 'What about the computer?')
})

test('synthesizeLocalSentence prefixes affirmative signs', () => {
  const s = synthesizeLocalSentence(['YES', 'BROTHER', 'HELP'])
  assert.match(s, /^Yes, /)
})
