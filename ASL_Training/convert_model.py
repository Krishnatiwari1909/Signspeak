import os
os.environ['TF_USE_LEGACY_KERAS'] = '1'

import sys
import shutil
from unittest.mock import MagicMock
sys.modules['tensorflow_decision_forests'] = MagicMock()
sys.modules['tensorflow_hub'] = MagicMock()

import tensorflow as tf
from tensorflowjs.converters import keras_h5_conversion

print("Loading trained checkpoint model...")
model = tf.keras.models.load_model('asl_model_checkpoint.h5')
model.summary()

# Save as asl_model.h5
model.save('asl_model.h5')
print("Saved asl_model.h5")

target_tfjs_dir = os.path.abspath('../sign-language-translator/public/models/asl')
print(f"Exporting model to TensorFlow.js at: {target_tfjs_dir}...")
os.makedirs(target_tfjs_dir, exist_ok=True)

# Clean out old shards if any
for f in os.listdir(target_tfjs_dir):
    if f.endswith('.bin') or f == 'model.json':
        try:
            os.remove(os.path.join(target_tfjs_dir, f))
        except Exception:
            pass

keras_h5_conversion.save_keras_model(model, target_tfjs_dir)

# Copy labels.json to frontend models folder
shutil.copy('labels.json', os.path.join(target_tfjs_dir, 'labels.json'))
print("Successfully deployed 101-class model and labels to frontend public/models/asl/!")

