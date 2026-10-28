import os
os.environ['TF_USE_LEGACY_KERAS'] = '1'

import json
import numpy as np
import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import (
    InputLayer, TimeDistributed, Conv1D, BatchNormalization,
    MaxPooling1D, Dropout, Bidirectional, GRU, Dense
)
from tensorflow.keras.callbacks import EarlyStopping, ReduceLROnPlateau
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.utils.class_weight import compute_class_weight

WINDOW_SIZE = 30
NUM_LANDMARKS = 135
COORDS = 3

print("Loading data...")
X = np.load('X.npy')
y_raw = np.load('y.npy')

encoder = LabelEncoder()
y_encoded = encoder.fit_transform(y_raw)
classes = list(encoder.classes_)
num_classes = len(classes)

# Save labels for the React frontend
with open('labels.json', 'w') as f:
    json.dump(classes, f)
print(f"Saved {num_classes} classes to labels.json: {classes}")

# Stratified 80/20 train-test split
X_train, X_val, y_train, y_val = train_test_split(
    X, y_encoded, test_size=0.2, random_state=42, stratify=y_encoded
)

# Compute class weights to eliminate single-class bias
class_weights = compute_class_weight(
    class_weight='balanced',
    classes=np.unique(y_train),
    y=y_train
)
weights_dict = dict(enumerate(class_weights))

print(f"Train samples: {len(X_train)}, Validation samples: {len(X_val)}")

# High-accuracy spatial-temporal sequence model
model = Sequential([
    InputLayer(batch_input_shape=(None, WINDOW_SIZE, NUM_LANDMARKS, COORDS)),
    
    # 1. Spatial feature extraction across landmarks
    TimeDistributed(Conv1D(64, kernel_size=3, padding='same', activation='relu')),
    TimeDistributed(BatchNormalization()),
    TimeDistributed(MaxPooling1D(pool_size=2)),
    TimeDistributed(Dropout(0.2)),
    
    TimeDistributed(Conv1D(128, kernel_size=3, padding='same', activation='relu')),
    TimeDistributed(BatchNormalization()),
    TimeDistributed(MaxPooling1D(pool_size=2)),
    TimeDistributed(tf.keras.layers.Flatten()),
    
    # 2. Bidirectional Temporal modeling (GRU forward and backward)
    Bidirectional(GRU(128, return_sequences=True, reset_after=False)),
    Dropout(0.3),
    Bidirectional(GRU(64, return_sequences=False, reset_after=False)),
    Dropout(0.3),
    
    # 3. Dense Classifier Head
    Dense(128, activation='relu'),
    BatchNormalization(),
    Dropout(0.4),
    Dense(num_classes, activation='softmax')
])

optimizer = tf.keras.optimizers.Adam(learning_rate=1e-3)
model.compile(
    optimizer=optimizer,
    loss='sparse_categorical_crossentropy',
    metrics=['accuracy']
)

model.summary()

from tensorflow.keras.callbacks import EarlyStopping, ReduceLROnPlateau, ModelCheckpoint

callbacks = [
    EarlyStopping(monitor='val_accuracy', patience=15, restore_best_weights=True, verbose=1),
    ReduceLROnPlateau(monitor='val_loss', factor=0.5, patience=5, min_lr=1e-5, verbose=1),
    ModelCheckpoint('asl_model_checkpoint.h5', monitor='val_accuracy', save_best_only=True, verbose=1)
]

print("\nStarting training...")
history = model.fit(
    X_train, y_train,
    validation_data=(X_val, y_val),
    epochs=80,
    batch_size=32,
    class_weight=weights_dict,
    callbacks=callbacks
)

val_loss, val_acc = model.evaluate(X_val, y_val, verbose=0)
print(f"\nFinal Validation Accuracy: {val_acc * 100:.2f}%")

model.save('asl_model.h5')
print("Saved trained model to asl_model.h5")