import numpy as np
import onnxruntime as ort
import json

session = ort.InferenceSession(r"C:\Foundational Project sem 5\sign-language-translator\public\models\gislr\model.onnx")
input_name = session.get_inputs()[0].name
output_name = session.get_outputs()[0].name

with open(r"C:\Foundational Project sem 5\sign-language-translator\public\models\gislr\labels.json") as f:
    labels = json.load(f)

# Case 1: Stationary hand (resting pose in front of camera)
stationary = np.full((30, 543, 3), np.nan, dtype=np.float32)
# Face: fixed coords
stationary[:, :468, 0] = 0.5
stationary[:, :468, 1] = 0.3
stationary[:, :468, 2] = 0.0
# Pose: fixed coords
stationary[:, 489:522, 0] = 0.5
stationary[:, 489:522, 1] = 0.6
stationary[:, 489:522, 2] = 0.0
# Right hand: fixed coords (stationary hand resting on desk)
stationary[:, 522:543, 0] = 0.6
stationary[:, 522:543, 1] = 0.7
stationary[:, 522:543, 2] = 0.0

res = session.run([output_name], {input_name: stationary})[0]
probs = np.exp(res - np.max(res)) / np.sum(np.exp(res - np.max(res)))
top5_indices = np.argsort(probs)[-5:][::-1]

print("--- Stationary Hand Case ---")
for idx in top5_indices:
    print(f"  {labels[idx]}: {probs[idx]:.4f}")

top1 = probs[top5_indices[0]]
top2 = probs[top5_indices[1]]
print(f"Top 1: {labels[top5_indices[0]]} ({top1:.4f}), Top 2: {labels[top5_indices[1]]} ({top2:.4f}), Margin: {top1 - top2:.4f}")

