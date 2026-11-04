import os
os.environ['TF_USE_LEGACY_KERAS'] = '1'

import sys
import json
import shutil
import numpy as np
import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import (
    InputLayer, TimeDistributed, Conv1D, BatchNormalization,
    MaxPooling1D, Dropout, Bidirectional, GRU, Dense, GlobalAveragePooling1D
)
from tensorflow.keras.callbacks import EarlyStopping, ReduceLROnPlateau, ModelCheckpoint
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.utils.class_weight import compute_class_weight

# Stubs for tensorflowjs converter on Windows without native decision forests
from unittest.mock import MagicMock
sys.modules['tensorflow_decision_forests'] = MagicMock()
sys.modules['tensorflow_hub'] = MagicMock()
from tensorflowjs.converters import keras_h5_conversion

WINDOW_SIZE = 30
NUM_LANDMARKS = 135
COORDS = 3

print("Loading augmented conversational dataset...")
X = np.load('X.npy')
y_raw = np.load('y.npy')

encoder = LabelEncoder()
y_encoded = encoder.fit_transform(y_raw)
classes = list(encoder.classes_)
num_classes = len(classes)

# Save labels for the React frontend
with open('labels.json', 'w') as f:
    json.dump(classes, f)
print(f"Dataset ready: {len(X)} samples across {num_classes} classes.")

# Stratified 80/20 train-test split
X_train, X_val, y_train, y_val = train_test_split(
    X, y_encoded, test_size=0.2, random_state=42, stratify=y_encoded
)

# Compute balanced class weights
class_weights = compute_class_weight(
    class_weight='balanced',
    classes=np.unique(y_train),
    y=y_train
)
weights_dict = dict(enumerate(class_weights))

print(f"Train samples: {len(X_train)}, Validation samples: {len(X_val)}")

# Fast, lightweight spatio-temporal architecture (204k params, 800 KB)
model = Sequential([
    InputLayer(batch_input_shape=(None, WINDOW_SIZE, NUM_LANDMARKS, COORDS)),
    
    # 1. Spatial feature extraction across landmarks
    TimeDistributed(Conv1D(64, kernel_size=3, padding='same', activation='relu')),
    TimeDistributed(BatchNormalization()),
    TimeDistributed(MaxPooling1D(pool_size=2)),
    TimeDistributed(Dropout(0.2)),
    
    TimeDistributed(Conv1D(128, kernel_size=3, padding='same', activation='relu')),
    TimeDistributed(BatchNormalization()),
    TimeDistributed(GlobalAveragePooling1D()),
    TimeDistributed(Dropout(0.2)),
    
    # 2. Bidirectional Temporal modeling
    Bidirectional(GRU(64, return_sequences=True, reset_after=False)),
    Dropout(0.3),
    Bidirectional(GRU(64, return_sequences=False, reset_after=False)),
    Dropout(0.3),
    
    # 3. Dense Classifier Head
    Dense(128, activation='relu'),
    BatchNormalization(),
    Dropout(0.3),
    Dense(num_classes, activation='softmax')
])

optimizer = tf.keras.optimizers.Adam(learning_rate=1e-3)
model.compile(
    optimizer=optimizer,
    loss='sparse_categorical_crossentropy',
    metrics=['accuracy']
)

model.summary()

callbacks = [
    EarlyStopping(monitor='val_accuracy', patience=10, restore_best_weights=True, verbose=1),
    ReduceLROnPlateau(monitor='val_loss', factor=0.5, patience=4, min_lr=1e-5, verbose=1),
    ModelCheckpoint('asl_model_checkpoint.h5', monitor='val_accuracy', save_best_only=True, verbose=1)
]

print("\nStarting training...")
history = model.fit(
    X_train, y_train,
    validation_data=(X_val, y_val),
    epochs=40,
    batch_size=64,
    class_weight=weights_dict,
    callbacks=callbacks
)

val_loss, val_acc = model.evaluate(X_val, y_val, verbose=0)
print(f"\n=========================================")
print(f"🎉 Final Validation Accuracy: {val_acc * 100:.2f}%")
print(f"=========================================")

model.save('asl_model.h5')
print("Saved trained model to asl_model.h5")

# Export directly to TensorFlow.js for the frontend
target_tfjs_dir = os.path.abspath('../sign-language-translator/public/models/asl')
print(f"\nExporting model to TensorFlow.js at: {target_tfjs_dir}...")
os.makedirs(target_tfjs_dir, exist_ok=True)

# Convert and save
keras_h5_conversion.save_keras_model(model, target_tfjs_dir)

# Copy labels.json to frontend models folder
shutil.copy('labels.json', os.path.join(target_tfjs_dir, 'labels.json'))
print("Successfully deployed 101-class model and labels to frontend public/models/asl/!")
