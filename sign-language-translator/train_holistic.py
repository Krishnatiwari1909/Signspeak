import os
import cv2
import numpy as np
import mediapipe as mp
import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import TimeDistributed, Conv1D, MaxPooling1D, Flatten, LSTM, Dense, Dropout
from tensorflow.keras.callbacks import EarlyStopping
import tensorflowjs as tfjs

# Constants
WINDOW_SIZE = 30
NUM_LANDMARKS = 543
COORDS_PER_LM = 3
DATA_DIR = 'dataset' # Folder containing subfolders of videos, e.g., dataset/HELLO/1.mp4
OUTPUT_DIR = 'asl_model_web'

mp_holistic = mp.solutions.holistic

def extract_landmarks(results):
    """Extracts [543, 3] landmarks per frame."""
    frame_data = np.zeros((NUM_LANDMARKS, COORDS_PER_LM), dtype=np.float32)
    offset = 0

    # 1. Face (468)
    if results.face_landmarks:
        for lm in results.face_landmarks.landmark:
            frame_data[offset] = [lm.x, lm.y, lm.z]
            offset += 1
    else:
        offset += 468

    # 2. Left Hand (21)
    if results.left_hand_landmarks:
        for lm in results.left_hand_landmarks.landmark:
            frame_data[offset] = [lm.x, lm.y, lm.z]
            offset += 1
    else:
        offset += 21

    # 3. Pose (33)
    if results.pose_landmarks:
        for lm in results.pose_landmarks.landmark:
            frame_data[offset] = [lm.x, lm.y, lm.z]
            offset += 1
    else:
        offset += 33

    # 4. Right Hand (21)
    if results.right_hand_landmarks:
        for lm in results.right_hand_landmarks.landmark:
            frame_data[offset] = [lm.x, lm.y, lm.z]
            offset += 1
    else:
        offset += 21

    return frame_data

def process_video(video_path, holistic):
    """Reads a video and extracts a [30, 543, 3] numpy array."""
    cap = cv2.VideoCapture(video_path)
    sequence = []
    
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break
            
        # Convert BGR to RGB
        image = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        image.flags.writeable = False
        results = holistic.process(image)
        
        frame_data = extract_landmarks(results)
        sequence.append(frame_data)

    cap.release()
    
    # Pad or truncate to WINDOW_SIZE
    sequence = np.array(sequence)
    
    if len(sequence) == 0:
        return np.zeros((WINDOW_SIZE, NUM_LANDMARKS, COORDS_PER_LM), dtype=np.float32)
        
    if len(sequence) < WINDOW_SIZE:
        # Pad with zeros at the end
        pad_len = WINDOW_SIZE - len(sequence)
        padding = np.zeros((pad_len, NUM_LANDMARKS, COORDS_PER_LM), dtype=np.float32)
        sequence = np.vstack((sequence, padding))
    else:
        # Truncate
        sequence = sequence[:WINDOW_SIZE]
        
    return sequence

def load_data(data_dir):
    """Loads all videos from the dataset directory."""
    X, y, labels = [], [], []
    
    if not os.path.exists(data_dir):
        print(f"Directory {data_dir} not found. Returning empty dataset for testing.")
        return np.empty((0, WINDOW_SIZE, NUM_LANDMARKS, COORDS_PER_LM)), np.empty((0,)), []
        
    classes = sorted(os.listdir(data_dir))
    
    with mp_holistic.Holistic(
        static_image_mode=False, 
        model_complexity=1, 
        enable_segmentation=False, 
        refine_face_landmarks=True) as holistic:
        
        for label_idx, class_name in enumerate(classes):
            class_dir = os.path.join(data_dir, class_name)
            if not os.path.isdir(class_dir):
                continue
                
            labels.append(class_name)
            print(f"Processing class: {class_name}")
            
            for video_name in os.listdir(class_dir):
                if not video_name.endswith('.mp4'):
                    continue
                    
                video_path = os.path.join(class_dir, video_name)
                sequence = process_video(video_path, holistic)
                
                X.append(sequence)
                y.append(label_idx)
                
    return np.array(X), np.array(y), labels

def build_model(num_classes):
    model = Sequential([
        TimeDistributed(Conv1D(64, kernel_size=3, padding='same', activation='relu'), input_shape=(WINDOW_SIZE, NUM_LANDMARKS, COORDS_PER_LM)),
        TimeDistributed(MaxPooling1D(pool_size=2)),
        TimeDistributed(Flatten()),
        LSTM(64),
        Dropout(0.3),
        Dense(64, activation='relu'),
        Dense(num_classes, activation='softmax')
    ])
    model.compile(optimizer='adam', loss='sparse_categorical_crossentropy', metrics=['accuracy'])
    return model

def main():
    print("Extracting features from videos...")
    X, y, labels = load_data(DATA_DIR)
    
    if len(X) == 0:
        print("No data found! Please add videos to the dataset directory (e.g. dataset/HELLO/1.mp4).")
        print("Generating dummy data for demonstration...")
        labels = ["HELLO", "THANK_YOU"]
        X = np.random.rand(10, WINDOW_SIZE, NUM_LANDMARKS, COORDS_PER_LM).astype(np.float32)
        y = np.random.randint(0, 2, 10)
        
    num_classes = len(labels)
    
    print(f"Data shape: {X.shape}")
    print(f"Labels shape: {y.shape}")
    print(f"Classes: {labels}")
    
    print("Building model...")
    model = build_model(num_classes)
    model.summary()
    
    print("Training model...")
    callbacks = [EarlyStopping(monitor='loss', patience=5, restore_best_weights=True)]
    model.fit(X, y, epochs=50, batch_size=8, callbacks=callbacks)
    
    print(f"Exporting model to {OUTPUT_DIR}...")
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)
        
    tfjs.converters.save_keras_model(model, OUTPUT_DIR)
    
    import json
    with open(os.path.join(OUTPUT_DIR, 'labels.json'), 'w') as f:
        json.dump(labels, f)
        
    print("Done! Copy the contents of the output directory to 'public/models/asl/'.")

if __name__ == '__main__':
    main()
