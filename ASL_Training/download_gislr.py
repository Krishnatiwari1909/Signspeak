import os
import urllib.request
import json
import tensorflow as tf

MODEL_DIR = os.path.join(os.path.dirname(__file__), "gislr_model")
os.makedirs(MODEL_DIR, exist_ok=True)

MODEL_URL = "https://huggingface.co/sign/kaggle-asl-signs-1st-place/resolve/main/model.tflite"
MAP_URL = "https://huggingface.co/sign/kaggle-asl-signs-1st-place/resolve/main/sign_to_prediction_index_map.json"

tflite_path = os.path.join(MODEL_DIR, "model.tflite")
map_path = os.path.join(MODEL_DIR, "sign_to_prediction_index_map.json")

if not os.path.exists(tflite_path):
    print("Downloading model.tflite (10.7 MB)...")
    urllib.request.urlretrieve(MODEL_URL, tflite_path)
    print("Downloaded model.tflite successfully.")
else:
    print("model.tflite already exists.")

if not os.path.exists(map_path):
    print("Downloading sign_to_prediction_index_map.json...")
    urllib.request.urlretrieve(MAP_URL, map_path)
    print("Downloaded sign_to_prediction_index_map.json successfully.")
else:
    print("sign_to_prediction_index_map.json already exists.")

print("\n--- Inspecting TFLite Model ---")
interpreter = tf.lite.Interpreter(model_path=tflite_path)
runner = interpreter.get_signature_runner()

print("Signature runners available:", interpreter.get_signature_list())
input_details = interpreter.get_input_details()
print("Input details:")
for inp in input_details:
    print(" ", inp["name"], inp["shape"], inp["dtype"])

output_details = interpreter.get_output_details()
print("Output details:")
for out in output_details:
    print(" ", out["name"], out["shape"], out["dtype"])

with open(map_path, "r") as f:
    sign_map = json.load(f)
print(f"Total vocabulary classes: {len(sign_map)}")
print("First 10 words:", list(sign_map.keys())[:10])
