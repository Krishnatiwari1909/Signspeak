import json

with open(r"C:\Foundational Project sem 5\sign-language-translator\public\models\gislr\labels.json") as f:
    gislr_labels = json.load(f)

with open(r"C:\Foundational Project sem 5\sign-language-translator\public\models\asl\labels.json") as f:
    asl_labels = json.load(f)

# Inspect what roles are needed
print(f"GISLR labels: {len(gislr_labels)}")
print(f"ASL labels: {len(asl_labels)}")
