import json

with open(r"C:\Foundational Project sem 5\sign-language-translator\public\models\gislr\labels.json", "r") as f:
    labels = json.load(f)

print(f"Total labels: {len(labels)}")

# Check formatting/capitalization
print("Labels with non-standard naming:")
for w in labels:
    if not w.islower():
        print(f"  {w}")
