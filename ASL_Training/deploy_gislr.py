import json
import shutil
import os

source_dir = r"C:\Foundational Project sem 5\ASL_Training\gislr_model"
target_dir = r"C:\Foundational Project sem 5\sign-language-translator\public\models\gislr"
os.makedirs(target_dir, exist_ok=True)

# 1. Copy model.onnx
src_onnx = os.path.join(source_dir, "model.onnx")
dst_onnx = os.path.join(target_dir, "model.onnx")
print(f"Copying {src_onnx} to {dst_onnx}...")
shutil.copyfile(src_onnx, dst_onnx)

# 2. Convert sign_to_prediction_index_map.json to ordered array labels.json
map_file = os.path.join(source_dir, "sign_to_prediction_index_map.json")
with open(map_file, "r") as f:
    mapping = json.load(f)

labels = [None] * len(mapping)
for word, idx in mapping.items():
    labels[idx] = word

assert None not in labels, "Missing index in labels!"
print(f"Extracted {len(labels)} labels.")
print(f"Indices 0..9: {labels[:10]}")

dst_labels = os.path.join(target_dir, "labels.json")
with open(dst_labels, "w") as f:
    json.dump(labels, f, indent=2)

print(f"Saved labels.json to {dst_labels}")

