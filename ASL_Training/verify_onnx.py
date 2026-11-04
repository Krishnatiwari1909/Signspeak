import numpy as np
import tensorflow as tf
import onnxruntime as ort
import time

tflite_path = r"C:\Foundational Project sem 5\ASL_Training\gislr_model\model.tflite"
onnx_path = r"C:\Foundational Project sem 5\ASL_Training\gislr_model\model.onnx"

print("--- Testing TFLite ---")
interpreter = tf.lite.Interpreter(model_path=tflite_path)
runner = interpreter.get_signature_runner("serving_default")

# Generate test random sequence of 30 frames
np.random.seed(42)
test_input = np.random.randn(30, 543, 3).astype(np.float32)

t0 = time.time()
tflite_res = runner(inputs=test_input)["outputs"]
tflite_time = (time.time() - t0) * 1000
print(f"TFLite output shape: {tflite_res.shape}, time: {tflite_time:.1f}ms")
tflite_top5 = np.argsort(tflite_res)[-5:][::-1]
print(f"TFLite top 5 classes: {tflite_top5}")

print("\n--- Testing ONNX ---")
session = ort.InferenceSession(onnx_path)
input_name = session.get_inputs()[0].name
output_name = session.get_outputs()[0].name
print(f"ONNX input name: {input_name}, shape: {session.get_inputs()[0].shape}")
print(f"ONNX output name: {output_name}, shape: {session.get_outputs()[0].shape}")

t0 = time.time()
onnx_res = session.run([output_name], {input_name: test_input})[0]
onnx_time = (time.time() - t0) * 1000
print(f"ONNX output shape: {onnx_res.shape}, time: {onnx_time:.1f}ms")
onnx_top5 = np.argsort(onnx_res)[-5:][::-1]
print(f"ONNX top 5 classes: {onnx_top5}")

diff = np.max(np.abs(tflite_res - onnx_res))
print(f"\nMax difference between TFLite and ONNX: {diff:.6e}")
if np.all(tflite_top5 == onnx_top5):
    print("SUCCESS: Both models produce identical top-5 predictions!")
else:
    print("Predictions differ slightly.")
