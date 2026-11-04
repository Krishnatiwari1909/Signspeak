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

  // --- Pronouns & Roles ---
  HESHEIT: { type: 'subject', english: 'he/she', form: 'third' },
  WEUS: { type: 'subject', english: 'we', form: 'first_plural' },
  MINEMY: { type: 'possessive', english: 'my' },
  YOURSELF: { type: 'object_pronoun', english: 'yourself' },

  // --- Civility & Greetings ---
  THANKYOU: { type: 'polite', english: 'Thank you' },
  BYE: { type: 'greeting', english: 'Goodbye' },
  SHHH: { type: 'interjection', english: 'Quiet' },
  OWIE: { type: 'desc', english: 'hurt' },

  // --- People & Family ---
  MOM: { type: 'subject', english: 'mom' },
  DAD: { type: 'subject', english: 'dad' },
  GRANDMA: { type: 'subject', english: 'grandma' },
  GRANDPA: { type: 'subject', english: 'grandpa' },
  AUNT: { type: 'subject', english: 'aunt' },
  UNCLE: { type: 'subject', english: 'uncle' },
  CHILD: { type: 'subject', english: 'the child' },
  COWBOY: { type: 'subject', english: 'the cowboy' },
  FIREMAN: { type: 'subject', english: 'the firefighter' },
  POLICE: { type: 'subject', english: 'the police' },
  CLOWN: { type: 'subject', english: 'the clown' },

  // --- Animals ---
  ALLIGATOR: { type: 'object', english: 'an alligator' },
  ANIMAL: { type: 'object', english: 'the animal' },
  BEE: { type: 'object', english: 'a bee' },
  BIRD: { type: 'object', english: 'a bird' },
  BUG: { type: 'object', english: 'a bug' },
  CAT: { type: 'object', english: 'the cat' },
  COW: { type: 'object', english: 'the cow' },
  DOG: { type: 'object', english: 'the dog' },
  DOLL: { type: 'object', english: 'a doll' },
  DONKEY: { type: 'object', english: 'a donkey' },
  DUCK: { type: 'object', english: 'a duck' },
  ELEPHANT: { type: 'object', english: 'an elephant' },
  FISH: { type: 'object', english: 'a fish' },
  FROG: { type: 'object', english: 'a frog' },
  GIRAFFE: { type: 'object', english: 'a giraffe' },
  GOOSE: { type: 'object', english: 'a goose' },
  HEN: { type: 'object', english: 'a hen' },
  HORSE: { type: 'object', english: 'a horse' },
  KITTY: { type: 'object', english: 'the kitty' },
  LION: { type: 'object', english: 'a lion' },
  MOUSE: { type: 'object', english: 'a mouse' },
  OWL: { type: 'object', english: 'an owl' },
  PIG: { type: 'object', english: 'a pig' },
  PUPPY: { type: 'object', english: 'the puppy' },
  TIGER: { type: 'object', english: 'a tiger' },
  WOLF: { type: 'object', english: 'a wolf' },
  ZEBRA: { type: 'object', english: 'a zebra' },

  // --- Food & Drinks ---
  CARROT: { type: 'object', english: 'a carrot' },
  CEREAL: { type: 'object', english: 'cereal' },
  CHOCOLATE: { type: 'object', english: 'chocolate' },
  FRENCHFRIES: { type: 'object', english: 'french fries' },
  GUM: { type: 'object', english: 'gum' },
  ICECREAM: { type: 'object', english: 'ice cream' },
  MILK: { type: 'object', english: 'milk' },
  NUTS: { type: 'object', english: 'nuts' },
  SNACK: { type: 'object', english: 'a snack' },

  // --- Everyday Objects, Clothing & Nature ---
  TV: { type: 'object', english: 'the TV' },
  AIRPLANE: { type: 'object', english: 'an airplane' },
  ARM: { type: 'object', english: 'the arm' },
  BACKYARD: { type: 'object', english: 'the backyard' },
  BALLOON: { type: 'object', english: 'a balloon' },
  BATH: { type: 'object', english: 'a bath' },
  BEDROOM: { type: 'object', english: 'the bedroom' },
  BOAT: { type: 'object', english: 'a boat' },
  CHAIR: { type: 'object', english: 'the chair' },
  CHEEK: { type: 'object', english: 'the cheek' },
  CHIN: { type: 'object', english: 'the chin' },
  CLOSET: { type: 'object', english: 'the closet' },
  CLOUD: { type: 'object', english: 'a cloud' },
  DRAWER: { type: 'object', english: 'the drawer' },
  DRYER: { type: 'object', english: 'the dryer' },
  EAR: { type: 'object', english: 'the ear' },
  EYE: { type: 'object', english: 'the eye' },
  FACE: { type: 'object', english: 'the face' },
  FARM: { type: 'object', english: 'the farm' },
  FEET: { type: 'object', english: 'the feet' },
  FINGER: { type: 'object', english: 'the finger' },
  FLAG: { type: 'object', english: 'the flag' },
  FLOWER: { type: 'object', english: 'a flower' },
  GARBAGE: { type: 'object', english: 'the garbage' },
  GIFT: { type: 'object', english: 'a gift' },
  GLASSWINDOW: { type: 'object', english: 'the window' },
  GRASS: { type: 'object', english: 'the grass' },
  HAIR: { type: 'object', english: 'hair' },
  HAT: { type: 'object', english: 'a hat' },
  HEAD: { type: 'object', english: 'the head' },
  HELICOPTER: { type: 'object', english: 'a helicopter' },
  JACKET: { type: 'object', english: 'a jacket' },
  JEANS: { type: 'object', english: 'jeans' },
  LAMP: { type: 'object', english: 'the lamp' },
  LIPS: { type: 'object', english: 'the lips' },
  MITTEN: { type: 'object', english: 'the mitten' },
  MOON: { type: 'object', english: 'the moon' },
  MORNING: { type: 'object', english: 'the morning' },
  MOUTH: { type: 'object', english: 'the mouth' },
  NAPKIN: { type: 'object', english: 'a napkin' },
  NIGHT: { type: 'object', english: 'night' },
  NOSE: { type: 'object', english: 'the nose' },
  PAJAMAS: { type: 'object', english: 'pajamas' },
  PEN: { type: 'object', english: 'a pen' },
  PENCIL: { type: 'object', english: 'a pencil' },
  PENNY: { type: 'object', english: 'a penny' },
  POOL: { type: 'object', english: 'the pool' },
  POTTY: { type: 'object', english: 'the potty' },
  PUZZLE: { type: 'object', english: 'a puzzle' },
  RADIO: { type: 'object', english: 'the radio' },
  RAIN: { type: 'object', english: 'rain' },
  REFRIGERATOR: { type: 'object', english: 'the refrigerator' },
  SCISSORS: { type: 'object', english: 'scissors' },
  SHOE: { type: 'object', english: 'shoes' },
  SHOWER: { type: 'object', english: 'a shower' },
  SNOW: { type: 'object', english: 'snow' },
  STAIRS: { type: 'object', english: 'the stairs' },
  STORE: { type: 'object', english: 'the store' },
  STORY: { type: 'object', english: 'a story' },
  SUN: { type: 'object', english: 'the sun' },
  TABLE: { type: 'object', english: 'the table' },
  TONGUE: { type: 'object', english: 'the tongue' },
  TOOTH: { type: 'object', english: 'the tooth' },
  TOOTHBRUSH: { type: 'object', english: 'a toothbrush' },
  TOY: { type: 'object', english: 'a toy' },
  TREE: { type: 'object', english: 'the tree' },
  UNDERWEAR: { type: 'object', english: 'underwear' },
  VACUUM: { type: 'object', english: 'the vacuum' },
  ZIPPER: { type: 'object', english: 'the zipper' },

  // --- Verbs & Actions ---
  AWAKE: { type: 'verb', present: 'wakes up', past: 'woke up', continuous: 'waking up' },
  BLOW: { type: 'verb', present: 'blows', past: 'blew', continuous: 'blowing' },
  CALLONPHONE: { type: 'verb', present: 'calls', past: 'called', continuous: 'calling' },
  CLEAN: { type: 'verb', present: 'cleans', past: 'cleaned', continuous: 'cleaning' },
  CLOSE: { type: 'verb', present: 'closes', past: 'closed', continuous: 'closing' },
  CRY: { type: 'verb', present: 'cries', past: 'cried', continuous: 'crying' },
  CUT: { type: 'verb', present: 'cuts', past: 'cut', continuous: 'cutting' },
  DANCE: { type: 'verb', present: 'dances', past: 'danced', continuous: 'dancing' },
  DROP: { type: 'verb', present: 'drops', past: 'dropped', continuous: 'dropping' },
  DRY: { type: 'verb', present: 'dries', past: 'dried', continuous: 'drying' },
  FALL: { type: 'verb', present: 'falls', past: 'fell', continuous: 'falling' },
  FIND: { type: 'verb', present: 'finds', past: 'found', continuous: 'finding' },
  HATE: { type: 'verb', present: 'hates', past: 'hated', continuous: 'hating' },
  HAVETO: { type: 'modal', english: 'has to' },
  HIDE: { type: 'verb', present: 'hides', past: 'hid', continuous: 'hiding' },
  JUMP: { type: 'verb', present: 'jumps', past: 'jumped', continuous: 'jumping' },
  KISS: { type: 'verb', present: 'kisses', past: 'kissed', continuous: 'kissing' },
  LISTEN: { type: 'verb', present: 'listens', past: 'listened', continuous: 'listening' },
  LOOK: { type: 'verb', present: 'looks', past: 'looked', continuous: 'looking' },
  MAKE: { type: 'verb', present: 'makes', past: 'made', continuous: 'making' },
  NAP: { type: 'verb', present: 'naps', past: 'napped', continuous: 'napping' },
  OPEN: { type: 'verb', present: 'opens', past: 'opened', continuous: 'opening' },
  PRETEND: { type: 'verb', present: 'pretends', past: 'pretended', continuous: 'pretending' },
  RIDE: { type: 'verb', present: 'rides', past: 'rode', continuous: 'riding' },
  SAY: { type: 'verb', present: 'says', past: 'said', continuous: 'saying' },
  SLEEP: { type: 'verb', present: 'sleeps', past: 'slept', continuous: 'sleeping' },
  SMILE: { type: 'verb', present: 'smiles', past: 'smiled', continuous: 'smiling' },
  STAY: { type: 'verb', present: 'stays', past: 'stayed', continuous: 'staying' },
  STUCK: { type: 'desc', english: 'stuck' },
  TALK: { type: 'verb', present: 'talks', past: 'talked', continuous: 'talking' },
  TASTE: { type: 'verb', present: 'tastes', past: 'tasted', continuous: 'tasting' },
  TOUCH: { type: 'verb', present: 'touches', past: 'touched', continuous: 'touching' },
  WAKE: { type: 'verb', present: 'wakes', past: 'woke', continuous: 'waking' },

  // --- Adjectives & Modifiers ---
  BETTER: { type: 'desc', english: 'better' },
  BLACK: { type: 'desc', english: 'black' },
  BLUE: { type: 'desc', english: 'blue' },
  BROWN: { type: 'desc', english: 'brown' },
  CUTE: { type: 'desc', english: 'cute' },
  DIRTY: { type: 'desc', english: 'dirty' },
  EMPTY: { type: 'desc', english: 'empty' },
  EVERY: { type: 'quantifier', english: 'every' },
  FAST: { type: 'desc', english: 'fast' },
  FIRST: { type: 'desc', english: 'first' },
  GREEN: { type: 'desc', english: 'green' },
  HIGH: { type: 'desc', english: 'high' },
  HOT: { type: 'desc', english: 'hot' },
  HUNGRY: { type: 'desc', english: 'hungry' },
  LOUD: { type: 'desc', english: 'loud' },
  MAD: { type: 'desc', english: 'mad' },
  MANY: { type: 'quantifier', english: 'many' },
  NOISY: { type: 'desc', english: 'noisy' },
  OLD: { type: 'desc', english: 'old' },
  ORANGE: { type: 'desc', english: 'orange' },
  PRETTY: { type: 'desc', english: 'pretty' },
  QUIET: { type: 'desc', english: 'quiet' },
  RED: { type: 'desc', english: 'red' },
  SAME: { type: 'desc', english: 'same' },
  SICK: { type: 'desc', english: 'sick' },
  SLEEPY: { type: 'desc', english: 'sleepy' },
  STICKY: { type: 'desc', english: 'sticky' },
  THIRSTY: { type: 'desc', english: 'thirsty' },
  WET: { type: 'desc', english: 'wet' },
  WHITE: { type: 'desc', english: 'white' },
  YELLOW: { type: 'desc', english: 'yellow' },
  YUCKY: { type: 'desc', english: 'yucky' },

  // --- Prepositions & Time ---
  AFTER: { type: 'prep', english: 'after' },
  ANOTHER: { type: 'quantifier', english: 'another' },
  ANY: { type: 'quantifier', english: 'any' },
  BECAUSE: { type: 'prep', english: 'because' },
  BESIDE: { type: 'prep', english: 'beside' },
  CAN: { type: 'modal', english: 'can' },
  DOWN: { type: 'prep', english: 'down' },
  FOR: { type: 'prep', english: 'for' },
  IF: { type: 'prep', english: 'if' },
  INTO: { type: 'prep', english: 'into' },
  ON: { type: 'prep', english: 'on' },
  OUTSIDE: { type: 'prep', english: 'outside' },
  THAT: { type: 'object', english: 'that' },
  UP: { type: 'prep', english: 'up' },
  WILL: { type: 'modal', english: 'will' },

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
    if (single === 'THANK_YOU' || single === 'THANKYOU') return 'Thank you!'
    if (single === 'BYE') return 'Goodbye!'
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
    } else if (role.type === 'object') {
      if (!isQuestion && !subject && !verb) {
        subject = possessive ? `${possessive} ${role.english}` : role.english
        possessive = ''
      } else if (!object) {
        object = role.english
      } else {
        modifiers.push(role.english)
      }
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
