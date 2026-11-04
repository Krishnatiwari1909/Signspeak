import json

with open(r"C:\Foundational Project sem 5\sign-language-translator\public\models\gislr\labels.json") as f:
    gislr_words = json.load(f)

# Existing roles in grammar.js
existing_keys = {
  'HELLO', 'THANK_YOU', 'PLEASE', 'SORRY', 'YES', 'NO', 'I', 'ME', 'MY', 'YOU', 'WE',
  'MOTHER', 'FATHER', 'FAMILY', 'BROTHER', 'SISTER', 'COUSIN', 'FRIEND', 'TEACHER', 'STUDENT',
  'MAN', 'WOMAN', 'BOY', 'GIRL', 'BABY', 'PERSON', 'NAME', 'WANT', 'NEED', 'LIKE', 'LOVE',
  'HAVE', 'EAT', 'DRINK', 'HELP', 'GO', 'COME', 'SEE', 'KNOW', 'UNDERSTAND', 'WORK', 'PLAY',
  'STOP', 'WAIT', 'MEET', 'CALL', 'CHANGE', 'CHECK', 'LEAVE', 'FINISH', 'READ', 'WRITE',
  'HEAR', 'THINK', 'GIVE', 'FOOD', 'WATER', 'APPLE', 'CANDY', 'PIZZA', 'BED', 'COMPUTER',
  'BOOK', 'CAR', 'MONEY', 'SHIRT', 'ROOM', 'SCHOOL', 'HOME', 'PHONE', 'GOOD', 'BAD', 'HAPPY',
  'SAD', 'NICE', 'FINE', 'COLD', 'TALL', 'NOW', 'TODAY', 'TOMORROW', 'YESTERDAY', 'TIME',
  'HERE', 'THERE', 'WHAT', 'WHERE', 'WHO', 'WHY', 'HOW', 'MORE', 'SOME', 'ALL', 'NOT',
  'AND', 'BUT', 'WITH', 'ABOUT'
}

missing = [w for w in gislr_words if w.upper() not in existing_keys]
print(f"GISLR words to add to WORD_ROLES: {len(missing)}")
print("First 30 missing words:", missing[:30])
