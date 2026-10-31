/**
 * Grammar & Sentence Synthesis Engine for ASL Glosses.
 * 
 * Supports:
 * 1. Fast local deterministic rule-based grammar correction (100% offline).
 * 2. Optional AI / LLM enhancement (e.g. Gemini / Groq / OpenAI) if an API key is provided.
 */

// Parts of speech mapping for the 50 active ASL vocabulary words
const WORD_ROLES = {
  // People / Subjects
  BROTHER: { type: 'subject', english: 'my brother' },
  COUSIN: { type: 'subject', english: 'my cousin' },
  FAMILY: { type: 'subject', english: 'my family' },
  MAN: { type: 'subject', english: 'the man' },
  MOTHER: { type: 'subject', english: 'my mother' },
  DOG: { type: 'subject', english: 'the dog' },

  // Verbs / Actions
  CALL: { type: 'verb', present: 'call', past: 'called', continuous: 'calling' },
  CHANGE: { type: 'verb', present: 'change', past: 'changed', continuous: 'changing' },
  CHECK: { type: 'verb', present: 'check', past: 'checked', continuous: 'checking' },
  DRINK: { type: 'verb', present: 'drink', past: 'drank', continuous: 'drinking' },
  GO: { type: 'verb', present: 'go', past: 'went', continuous: 'going' },
  HELP: { type: 'verb', present: 'help', past: 'helped', continuous: 'helping' },
  LAUGH: { type: 'verb', present: 'laugh', past: 'laughed', continuous: 'laughing' },
  LEAVE: { type: 'verb', present: 'leave', past: 'left', continuous: 'leaving' },
  PLAY: { type: 'verb', present: 'play', past: 'played', continuous: 'playing' },
  TRADE: { type: 'verb', present: 'trade', past: 'traded', continuous: 'trading' },
  SCORE: { type: 'verb', present: 'score', past: 'scored', continuous: 'scoring' },

  // Objects / Places
  APPLE: { type: 'object', english: 'an apple' },
  BAR: { type: 'object', english: 'the bar' },
  BASKETBALL: { type: 'object', english: 'basketball' },
  BED: { type: 'object', english: 'the bed' },
  BOWLING: { type: 'object', english: 'bowling' },
  CANDY: { type: 'object', english: 'some candy' },
  COMPUTER: { type: 'object', english: 'the computer' },
  CORN: { type: 'object', english: 'corn' },
  LETTER: { type: 'object', english: 'the letter' },
  PIZZA: { type: 'object', english: 'pizza' },
  ROOM: { type: 'object', english: 'the room' },
  SHIRT: { type: 'object', english: 'a shirt' },
  ENVIRONMENT: { type: 'object', english: 'the environment' },
  EXAMPLE: { type: 'object', english: 'an example' },

  // Modifiers / Adjectives
  ACCIDENT: { type: 'desc', english: 'by accident' },
  CHAMPION: { type: 'desc', english: 'champion' },
  COLD: { type: 'desc', english: 'cold' },
  COOL: { type: 'desc', english: 'cool' },
  DARK: { type: 'desc', english: 'dark' },
  DEAF: { type: 'desc', english: 'deaf' },
  FAR: { type: 'desc', english: 'far away' },
  SHORT: { type: 'desc', english: 'short' },
  TALL: { type: 'desc', english: 'tall' },
  THIN: { type: 'desc', english: 'thin' },
  THANKSGIVING: { type: 'desc', english: 'for Thanksgiving' },

  // Time / Tense markers
  BEFORE: { type: 'time', english: 'Earlier', tense: 'past' },
  LAST: { type: 'time', english: 'Last time', tense: 'past' },
  LATER: { type: 'time', english: 'Later', tense: 'future' },
  DELAY: { type: 'time', english: 'There was a delay', tense: 'past' },

  // Question words
  WHAT: { type: 'question', english: 'What' },
  WHO: { type: 'question', english: 'Who' },

  // Confirmations
  YES: { type: 'affirm', english: 'Yes' },
  NO: { type: 'affirm', english: 'No' },
}

/**
 * Local rule-based ASL Gloss to English grammar synthesizer.
 * Runs instantly in the browser without network access.
 * 
 * @param {string[]} glosses Array of detected sign labels e.g. ["HELP", "COMPUTER"]
 * @returns {string} Grammatically corrected English sentence
 */
export function synthesizeLocalSentence(glosses) {
  if (!glosses || glosses.length === 0) return ''

  // Filter out any idle tokens and deduplicate adjacent identical tokens
  const clean = []
  for (let i = 0; i < glosses.length; i++) {
    const g = glosses[i].toUpperCase().trim()
    if (g && g !== '_IDLE' && g !== clean[clean.length - 1]) {
      clean.push(g)
    }
  }

  if (clean.length === 0) return ''
  if (clean.length === 1) {
    const single = clean[0]
    if (single === 'YES') return 'Yes.'
    if (single === 'NO') return 'No.'
    if (single === 'HELP') return 'Please help me.'
    return `${single.charAt(0) + single.slice(1).toLowerCase()}.`
  }

  let tense = 'present'
  let isQuestion = false
  let prefix = ''
  let questionWord = ''
  let subject = ''
  let verb = ''
  let object = ''
  let modifiers = []

  // Check for time markers and questions
  clean.forEach((g) => {
    const role = WORD_ROLES[g]
    if (!role) {
      modifiers.push(g.toLowerCase())
      return
    }

    if (role.type === 'affirm') {
      prefix = `${role.english}, `
    } else if (role.type === 'question') {
      isQuestion = true
      questionWord = role.english
    } else if (role.type === 'time') {
      tense = role.tense || tense
      modifiers.push(role.english.toLowerCase())
    } else if (role.type === 'subject' && !subject) {
      subject = role.english
    } else if (role.type === 'verb' && !verb) {
      verb = tense === 'past' ? role.past : role.present
    } else if (role.type === 'object' && !object) {
      object = role.english
    } else {
      modifiers.push(role.english || g.toLowerCase())
    }
  })

  // Construct standard conversational sentence
  let sentence = ''

  if (isQuestion) {
    if (verb && subject) {
      sentence = `${questionWord} is ${subject} ${verb}?`
    } else if (verb) {
      sentence = `${questionWord} can we ${verb}?`
    } else if (object) {
      sentence = `${questionWord} about ${object}?`
    } else {
      sentence = `${questionWord} happened?`
    }
  } else if (subject && verb && object) {
    sentence = `${subject} ${verb} ${object}`
  } else if (subject && verb) {
    sentence = `${subject} ${verb}s`
  } else if (verb && object) {
    sentence = verb === 'help' 
      ? `Please help with ${object}`
      : `Let's ${verb} ${object}`
  } else if (subject && object) {
    sentence = `${subject} needs ${object}`
  } else if (verb) {
    sentence = `Please ${verb}`
  } else {
    // Fallback: join with natural articles
    const words = clean.map((g) => {
      const r = WORD_ROLES[g]
      return r?.english || g.charAt(0) + g.slice(1).toLowerCase()
    })
    sentence = words.join(' ')
  }

  if (modifiers.length > 0) {
    sentence = `${sentence} (${modifiers.join(', ')})`
  }

  // Capitalize first letter and add punctuation
  let full = prefix + sentence
  full = full.charAt(0).toUpperCase() + full.slice(1)
  if (!full.endsWith('.') && !full.endsWith('?')) {
    full += '.'
  }

  return full
}

/**
 * Optional AI Grammar Engine (Gemini / LLM API).
 * Used when an API key is provided, falls back to local synthesis on error.
 */
export async function translateSentenceWithAI(glosses, apiKey = '') {
  if (!apiKey) {
    return synthesizeLocalSentence(glosses)
  }

  const prompt = `You are an expert American Sign Language (ASL) interpreter.
Convert this sequence of detected ASL sign glosses into a single, natural, fluent English sentence with proper grammar, pronouns, and articles:
ASL Glosses: ${glosses.join(', ')}

Output ONLY the translated English sentence, with no commentary, quotation marks, or extra text.`

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 60 }
      })
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const data = await response.json()
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
    return text || synthesizeLocalSentence(glosses)
  } catch (err) {
    console.warn('AI translation failed, falling back to local engine:', err)
    return synthesizeLocalSentence(glosses)
  }
}
