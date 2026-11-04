import numpy as np
import tensorflow as tf
import json

model_path = r"C:\Foundational Project sem 5\ASL_Training\gislr_model\model.tflite"
interpreter = tf.lite.Interpreter(model_path=model_path)
runner = interpreter.get_signature_runner("serving_default")

print("Runner input details:", runner.get_input_details())
print("Runner output details:", runner.get_output_details())

# Test with 30 frames of 543 landmarks with 3 coords
dummy_input = np.zeros((30, 543, 3), dtype=np.float32)
res = runner(inputs=dummy_input)
out = res["outputs"]
print("Inference successful! Output shape:", out.shape)
print("Top 5 prediction indices:", np.argsort(out)[-5:][::-1])

