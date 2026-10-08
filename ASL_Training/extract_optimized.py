import os
import cv2
import numpy as np
import urllib.request
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

WINDOW_SIZE = 30
DATASET_DIR = 'dataset'
MODEL_PATH = 'holistic_landmarker.task'
MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/holistic_landmarker/holistic_landmarker/float16/latest/holistic_landmarker.task'

def download_model():
    if not os.path.exists(MODEL_PATH):
        print(f"Downloading MediaPipe model to {MODEL_PATH}...")
        urllib.request.urlretrieve(MODEL_URL, MODEL_PATH)
        print("Download complete!")

def extract_landmarks(result):
    """Extracts exactly 135 shoulder-centered landmarks to match features.js using the Tasks API."""
    frame_data = np.zeros((135, 3), dtype=np.float32)
    idx = 0

    # Calculate shoulder midpoint as origin (0, 0, 0)
    origin_x, origin_y, origin_z = 0.5, 0.5, 0.0
    if result.pose_landmarks and len(result.pose_landmarks) >= 13:
        l_shoulder = result.pose_landmarks[11]
        r_shoulder = result.pose_landmarks[12]
        origin_x = (l_shoulder.x + r_shoulder.x) / 2.0
        origin_y = (l_shoulder.y + r_shoulder.y) / 2.0
        origin_z = (l_shoulder.z + r_shoulder.z) / 2.0

    # 1. Pose (33 landmarks)
    if result.pose_landmarks:
        for lm in result.pose_landmarks:
            frame_data[idx] = [lm.x - origin_x, lm.y - origin_y, lm.z - origin_z]
            idx += 1
    else:
        idx += 33

    # 2. Left Hand (21 landmarks)
    if result.left_hand_landmarks:
        for lm in result.left_hand_landmarks:
            frame_data[idx] = [lm.x - origin_x, lm.y - origin_y, lm.z - origin_z]
            idx += 1
    else:
        idx += 21

    # 3. Right Hand (21 landmarks)
    if result.right_hand_landmarks:
        for lm in result.right_hand_landmarks:
            frame_data[idx] = [lm.x - origin_x, lm.y - origin_y, lm.z - origin_z]
            idx += 1
    else:
        idx += 21

    # 4. Face (First 60 landmarks)
    if result.face_landmarks:
        count = min(len(result.face_landmarks), 60)
        for i in range(count):
            lm = result.face_landmarks[i]
            frame_data[idx] = [lm.x - origin_x, lm.y - origin_y, lm.z - origin_z]
            idx += 1
        if count < 60:
            idx += (60 - count)  # Ensure idx always reaches 135
    else:
        idx += 60

    return frame_data

def process_video(video_path, landmarker):
    cap = cv2.VideoCapture(video_path)
    sequence = []
    
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break
        
        # Hard lock to 640x480 to prevent segmentation calculator mismatch
        frame = cv2.resize(frame, (640, 480), interpolation=cv2.INTER_AREA)
        image = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=image)
        
        result = landmarker.detect(mp_image)
        sequence.append(extract_landmarks(result))
        
    cap.release()

    sequence = np.array(sequence, dtype=np.float32)
    if len(sequence) == 0:
        return np.zeros((WINDOW_SIZE, 135, 3), dtype=np.float32)

    # Uniform temporal resample across the entire video duration
    if len(sequence) < WINDOW_SIZE:
        pad = np.zeros((WINDOW_SIZE - len(sequence), 135, 3), dtype=np.float32)
        sequence = np.vstack([sequence, pad])
    else:
        indices = np.linspace(0, len(sequence) - 1, WINDOW_SIZE, dtype=int)
        sequence = sequence[indices]

    return sequence

def augment_sequence(seq):
    """Generates synthetic variations: scale, joint jitter, and time shifts."""
    # 1. Random spatial scaling (simulates standing closer or further)
    scale = np.random.uniform(0.9, 1.1)
    augmented = seq * scale

    # 2. Gaussian joint jitter
    noise = np.random.normal(0, 0.005, size=augmented.shape).astype(np.float32)
    augmented += noise
    
    return augmented

def main():
    download_model()
    
    classes = sorted([d for d in os.listdir(DATASET_DIR) if os.path.isdir(os.path.join(DATASET_DIR, d))])
    print(f"Classes ({len(classes)}): {classes}")

    base_options = python.BaseOptions(model_asset_path=MODEL_PATH)
    options = vision.HolisticLandmarkerOptions(
        base_options=base_options,
        running_mode=vision.RunningMode.IMAGE
    )

    X, y = [], []
    with vision.HolisticLandmarker.create_from_options(options) as landmarker:
        for class_idx, class_name in enumerate(classes):
            class_path = os.path.join(DATASET_DIR, class_name)
            videos = [v for v in os.listdir(class_path) if v.endswith('.mp4')]
            print(f"[{class_idx+1}/{len(classes)}] Extracting {class_name} ({len(videos)} videos)...")
            
            for v in videos:
                seq = process_video(os.path.join(class_path, v), landmarker)
                X.append(seq)
                y.append(class_name)
                
                # Apply data augmentation only to action classes, not neutral _idle
                if class_name != '_idle':
                    X.append(augment_sequence(seq))
                    y.append(class_name)

    X = np.array(X, dtype=np.float32)
    y = np.array(y)

    print(f"\nExtraction complete. Total sequences: {X.shape[0]}")
    print(f"X shape: {X.shape}, y shape: {y.shape}")
    np.save('X.npy', X)
    np.save('y.npy', y)

if __name__ == '__main__':
    main()