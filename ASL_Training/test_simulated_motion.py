import numpy as np
import onnxruntime as ort

onnx_path = r"C:\Foundational Project sem 5\ASL_Training\gislr_model\model.onnx"
session = ort.InferenceSession(onnx_path)
input_name = session.get_inputs()[0].name
output_name = session.get_outputs()[0].name

# Create 30 frames
frames = np.full((30, 543, 3), np.nan, dtype=np.float32)

# Face: 0..467
frames[:, 0:468, 0] = 0.5
frames[:, 0:468, 1] = 0.3
frames[:, 0:468, 2] = 0.0

# Left hand: 468..488 (leave as NaN to simulate no left hand visible)

# Pose: 489..521
frames[:, 489:522, 0] = 0.5
frames[:, 489:522, 1] = 0.6
frames[:, 489:522, 2] = 0.0

# Right hand: 522..542 (simulating right hand moving)
for f in range(30):
    frames[f, 522:543, 0] = 0.5 + 0.1 * np.sin(f / 5.0)
    frames[f, 522:543, 1] = 0.4 + 0.1 * np.cos(f / 5.0)
    frames[f, 522:543, 2] = 0.0

res = session.run([output_name], {input_name: frames})[0]
print("Prediction shape:", res.shape)
print("Is finite:", np.all(np.isfinite(res)))
top5 = np.argsort(res)[-5:][::-1]
import json
with open(r"C:\Foundational Project sem 5\sign-language-translator\public\models\gislr\labels.json") as f:
    labels = json.load(f)
print("Top 5 predicted words for motion:", [labels[i] for i in top5])
print("Probabilities (softmax):")
probs = np.exp(res - np.max(res)) / np.sum(np.exp(res - np.max(res)))
for i in top5:
    print(f"  {labels[i]}: {probs[i]:.4f}")

