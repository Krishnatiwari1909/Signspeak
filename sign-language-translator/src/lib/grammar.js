/**
 * Grammar & Sentence Synthesis Engine for ASL Glosses.
 * 
 * Supports:
 * 1. Fast local deterministic rule-based grammar correction (100% offline).
 * 2. Conversational idioms (Greetings, requests, questions, feelings).
 * 3. Optional AI / LLM enhancement (e.g. Gemini / Groq / OpenAI) if an API key is provided.
 */

// Comprehensive parts of speech mapping for the 100 conversational ASL vocabulary words
const WORD_ROLES = {
  // Greetings & Civility
  HELLO: { type: 'greeting', english: 'Hello' },
  THANK_YOU: { type: 'polite', english: 'Thank you' },
  PLEASE: { type: 'polite', english: 'Please' },
  SORRY: { type: 'polite', english: 'Sorry' },
  YES: { type: 'affirm', english: 'Yes' },
  NO: { type: 'affirm', english: 'No' },

  // Pronouns & Subjects
  I: { type: 'subject', english: 'I', form: 'first' },
  ME: { type: 'object_pronoun', english: 'me' },
  MY: { type: 'possessive', english: 'my' },
  YOU: { type: 'subject', english: 'you', form: 'second' },
  WE: { type: 'subject', english: 'we', form: 'first_plural' },

  // People & Roles
  MOTHER: { type: 'subject', english: 'mother' },
  FATHER: { type: 'subject', english: 'father' },
  FAMILY: { type: 'subject', english: 'family' },
  BROTHER: { type: 'subject', english: 'brother' },
  SISTER: { type: 'subject', english: 'sister' },
  COUSIN: { type: 'subject', english: 'cousin' },
  FRIEND: { type: 'subject', english: 'friend' },
  TEACHER: { type: 'subject', english: 'teacher' },
  STUDENT: { type: 'subject', english: 'student' },
  MAN: { type: 'subject', english: 'the man' },
  WOMAN: { type: 'subject', english: 'the woman' },
  BOY: { type: 'subject', english: 'the boy' },
  GIRL: { type: 'subject', english: 'the girl' },
  BABY: { type: 'subject', english: 'the baby' },
  PERSON: { type: 'subject', english: 'the person' },
  NAME: { type: 'object', english: 'name' },

  // Verbs / Actions
  WANT: { type: 'verb', present: 'want', past: 'wanted', continuous: 'wanting' },
  NEED: { type: 'verb', present: 'need', past: 'needed', continuous: 'needing' },
  LIKE: { type: 'verb', present: 'like', past: 'liked', continuous: 'liking' },
  LOVE: { type: 'verb', present: 'love', past: 'loved', continuous: 'loving' },
  HAVE: { type: 'verb', present: 'have', past: 'had', continuous: 'having' },
  EAT: { type: 'verb', present: 'eat', past: 'ate', continuous: 'eating' },
  DRINK: { type: 'verb', present: 'drink', past: 'drank', continuous: 'drinking' },
  HELP: { type: 'verb', present: 'help', past: 'helped', continuous: 'helping' },
  GO: { type: 'verb', present: 'go', past: 'went', continuous: 'going' },
  COME: { type: 'verb', present: 'come', past: 'came', continuous: 'coming' },
  SEE: { type: 'verb', present: 'see', past: 'saw', continuous: 'seeing' },
  KNOW: { type: 'verb', present: 'know', past: 'knew', continuous: 'knowing' },
  UNDERSTAND: { type: 'verb', present: 'understand', past: 'understood', continuous: 'understanding' },
  WORK: { type: 'verb', present: 'work', past: 'worked', continuous: 'working' },
  PLAY: { type: 'verb', present: 'play', past: 'played', continuous: 'playing' },
  STOP: { type: 'verb', present: 'stop', past: 'stopped', continuous: 'stopping' },
  WAIT: { type: 'verb', present: 'wait', past: 'waited', continuous: 'waiting' },
  MEET: { type: 'verb', present: 'meet', past: 'met', continuous: 'meeting' },
  CALL: { type: 'verb', present: 'call', past: 'called', continuous: 'calling' },
  CHANGE: { type: 'verb', present: 'change', past: 'changed', continuous: 'changing' },
  CHECK: { type: 'verb', present: 'check', past: 'checked', continuous: 'checking' },
  LEAVE: { type: 'verb', present: 'leave', past: 'left', continuous: 'leaving' },
  FINISH: { type: 'verb', present: 'finish', past: 'finished', continuous: 'finishing' },
  READ: { type: 'verb', present: 'read', past: 'read', continuous: 'reading' },
  WRITE: { type: 'verb', present: 'write', past: 'wrote', continuous: 'writing' },
  HEAR: { type: 'verb', present: 'hear', past: 'heard', continuous: 'hearing' },
  THINK: { type: 'verb', present: 'think', past: 'thought', continuous: 'thinking' },
  GIVE: { type: 'verb', present: 'give', past: 'gave', continuous: 'giving' },

  // Objects, Places & Food
  FOOD: { type: 'object', english: 'food' },
  WATER: { type: 'object', english: 'water' },
  APPLE: { type: 'object', english: 'an apple' },
  CANDY: { type: 'object', english: 'candy' },
  PIZZA: { type: 'object', english: 'pizza' },
  BED: { type: 'object', english: 'the bed' },
  COMPUTER: { type: 'object', english: 'the computer' },
  BOOK: { type: 'object', english: 'the book' },
  CAR: { type: 'object', english: 'the car' },
  MONEY: { type: 'object', english: 'money' },
  SHIRT: { type: 'object', english: 'a shirt' },
  ROOM: { type: 'object', english: 'the room' },
  SCHOOL: { type: 'object', english: 'school' },
  HOME: { type: 'object', english: 'home' },
  PHONE: { type: 'object', english: 'the phone' },

  // Modifiers & Feelings
  GOOD: { type: 'desc', english: 'good' },
  BAD: { type: 'desc', english: 'bad' },
  HAPPY: { type: 'desc', english: 'happy' },
  SAD: { type: 'desc', english: 'sad' },
  NICE: { type: 'desc', english: 'nice' },
  FINE: { type: 'desc', english: 'fine' },
  COLD: { type: 'desc', english: 'cold' },
  TALL: { type: 'desc', english: 'tall' },
  SHORT: { type: 'desc', english: 'short' },
  BIG: { type: 'desc', english: 'big' },
  SMALL: { type: 'desc', english: 'small' },
  TIRED: { type: 'desc', english: 'tired' },

  // Time & Quantity
  TIME: { type: 'time', english: 'time' },
  TODAY: { type: 'time', english: 'today', tense: 'present' },
  TOMORROW: { type: 'time', english: 'tomorrow', tense: 'future' },
  YESTERDAY: { type: 'time', english: 'yesterday', tense: 'past' },
  BEFORE: { type: 'time', english: 'earlier', tense: 'past' },
  LATER: { type: 'time', english: 'later', tense: 'future' },
  NOW: { type: 'time', english: 'now', tense: 'present' },
  AGAIN: { type: 'time', english: 'again' },
  MORE: { type: 'desc', english: 'more' },
  ALL: { type: 'desc', english: 'all' },
  SOME: { type: 'desc', english: 'some' },
  DAY: { type: 'time', english: 'day' },

  // Question words
  WHAT: { type: 'question', english: 'What' },
  WHERE: { type: 'question', english: 'Where' },
  WHEN: { type: 'question', english: 'When' },
  WHY: { type: 'question', english: 'Why' },
  HOW: { type: 'question', english: 'How' },
  WHO: { type: 'question', english: 'Who' },
}

/**
 * Local rule-based ASL Gloss to English grammar synthesizer.
 * Runs instantly in the browser without network access.
 * 
 * @param {string[]} glosses Array of detected sign labels e.g. ["I", "WANT", "WATER"]
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

  // Single word checks
  if (clean.length === 1) {
    const single = clean[0]
    if (single === 'HELLO') return 'Hello!'
    if (single === 'THANK_YOU') return 'Thank you!'
    if (single === 'PLEASE') return 'Please.'
    if (single === 'SORRY') return 'Sorry.'
    if (single === 'YES') return 'Yes.'
    if (single === 'NO') return 'No.'
    if (single === 'HELP') return 'Please help me.'
    return `${single.charAt(0) + single.slice(1).toLowerCase()}.`
  }

  // Idiomatic pattern matches
  const joined = clean.join(' ')
  if (joined === 'NICE MEET YOU' || joined === 'NICE MEET' || joined === 'MEET YOU') {
    return 'Nice to meet you.'
  }
  if (joined === 'HELLO NICE MEET YOU') {
    return 'Hello, nice to meet you!'
  }
  if (joined === 'PLEASE HELP ME' || joined === 'PLEASE HELP') {
    return 'Please help me.'
  }
  if (joined === 'THANK_YOU TEACHER' || joined === 'THANK_YOU FRIEND') {
    const p = clean[1].toLowerCase()
    return `Thank you, ${p}!`
  }
  if (joined === 'MY NAME') {
    return 'My name is...'
  }

  let isQuestion = false
  let questionWord = ''
  let prefix = ''
  let subject = ''
  let verb = ''
  let object = ''
  let modifiers = []
  let possessive = ''

  clean.forEach((g) => {
    const role = WORD_ROLES[g]
    if (!role) {
      modifiers.push(g.toLowerCase())
      return
    }

    if (role.type === 'greeting') {
      prefix = 'Hello! '
    } else if (role.type === 'polite') {
      prefix = `${role.english}, `
    } else if (role.type === 'affirm') {
      prefix = `${role.english}, `
    } else if (role.type === 'possessive') {
      possessive = role.english
    } else if (role.type === 'question') {
      isQuestion = true
      questionWord = role.english
    } else if (role.type === 'subject') {
      if (!subject) {
        subject = possessive ? `${possessive} ${role.english}` : role.english
        possessive = ''
      } else if (!object) {
        object = role.english
      } else {
        modifiers.push(role.english)
      }
    } else if (role.type === 'verb' && !verb) {
      verb = role.present
    } else if (role.type === 'object' && !object) {
      object = role.english
    } else if (role.type === 'object_pronoun' && !object) {
      object = role.english
    } else {
      modifiers.push(role.english || g.toLowerCase())
    }
  })

  let sentence = ''

  if (isQuestion) {
    if (verb && subject) {
      sentence = `${questionWord} does ${subject} ${verb}?`
    } else if (verb) {
      sentence = `${questionWord} can we ${verb}?`
    } else if (subject) {
      sentence = `${questionWord} is ${subject}?`
    } else if (object) {
      sentence = `${questionWord} about ${object}?`
    } else {
      sentence = `${questionWord} is that?`
    }
  } else if (subject && verb && object) {
    // Subject-Verb-Object (e.g. I want water)
    const vStr = (subject === 'I' || subject === 'you' || subject === 'we') ? verb : `${verb}s`
    sentence = `${subject} ${vStr} ${object}`
  } else if (subject && verb) {
    const vStr = (subject === 'I' || subject === 'you' || subject === 'we') ? verb : `${verb}s`
    sentence = `${subject} ${vStr}`
  } else if (verb && object) {
    sentence = verb === 'help' ? `Please help with ${object}` : `Let's ${verb} ${object}`
  } else if (subject && object) {
    sentence = `${subject} needs ${object}`
  } else if (verb) {
    sentence = `Please ${verb}`
  } else if (subject) {
    sentence = `${subject}`
  } else {
    sentence = clean.map(w => w.toLowerCase()).join(' ')
  }

  if (modifiers.length > 0) {
    sentence = `${sentence} (${modifiers.join(', ')})`
  }

  let full = prefix + sentence
  full = full.trim()
  if (full.length > 0) {
    full = full.charAt(0).toUpperCase() + full.slice(1)
    if (!full.endsWith('.') && !full.endsWith('?') && !full.endsWith('!')) {
      full += '.'
    }
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
