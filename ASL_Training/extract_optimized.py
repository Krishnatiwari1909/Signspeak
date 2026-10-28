import os
import cv2
import numpy as np
import mediapipe as mp
import multiprocessing as mp_lib

WINDOW_SIZE = 30
DATASET_DIR = 'dataset'

# Global variable initialized per worker process
holistic_global = None

def init_worker():
    global holistic_global
    # Initialize the heavy MediaPipe model once per process to save overhead
    holistic_global = mp.solutions.holistic.Holistic(
        static_image_mode=False,
        model_complexity=1,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5
    )

def extract_landmarks(results):
    """Extracts exactly 135 shoulder-centered landmarks using Solutions API."""
    frame_data = np.zeros((135, 3), dtype=np.float32)
    idx = 0

    # Calculate shoulder midpoint as origin (0, 0, 0)
    origin_x, origin_y, origin_z = 0.5, 0.5, 0.0
    if results.pose_landmarks and len(results.pose_landmarks.landmark) >= 13:
        l_shoulder = results.pose_landmarks.landmark[11]
        r_shoulder = results.pose_landmarks.landmark[12]
        origin_x = (l_shoulder.x + r_shoulder.x) / 2.0
        origin_y = (l_shoulder.y + r_shoulder.y) / 2.0
        origin_z = (l_shoulder.z + r_shoulder.z) / 2.0

    # 1. Pose (33 landmarks)
    if results.pose_landmarks:
        for lm in results.pose_landmarks.landmark:
            frame_data[idx] = [lm.x - origin_x, lm.y - origin_y, lm.z - origin_z]
            idx += 1
    else:
        idx += 33

    # 2. Left Hand (21 landmarks)
    if results.left_hand_landmarks:
        for lm in results.left_hand_landmarks.landmark:
            frame_data[idx] = [lm.x - origin_x, lm.y - origin_y, lm.z - origin_z]
            idx += 1
    else:
        idx += 21

    # 3. Right Hand (21 landmarks)
    if results.right_hand_landmarks:
        for lm in results.right_hand_landmarks.landmark:
            frame_data[idx] = [lm.x - origin_x, lm.y - origin_y, lm.z - origin_z]
            idx += 1
    else:
        idx += 21

    # 4. Face (First 60 landmarks)
    if results.face_landmarks:
        count = min(len(results.face_landmarks.landmark), 60)
        for i in range(count):
            lm = results.face_landmarks.landmark[i]
            frame_data[idx] = [lm.x - origin_x, lm.y - origin_y, lm.z - origin_z]
            idx += 1
        if count < 60:
            idx += (60 - count)
    else:
        idx += 60

    return frame_data

def worker_process_video(args):
    """Worker function to process a single video using the process-global model."""
    video_path, class_name = args
    global holistic_global
    
    cap = cv2.VideoCapture(video_path)
    sequence = []
    
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break
        
        image = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        image.flags.writeable = False
        results = holistic_global.process(image)
        
        sequence.append(extract_landmarks(results))
        
    cap.release()

    sequence = np.array(sequence, dtype=np.float32)
    if len(sequence) == 0:
        seq = np.zeros((WINDOW_SIZE, 135, 3), dtype=np.float32)
    elif len(sequence) < WINDOW_SIZE:
        pad = np.zeros((WINDOW_SIZE - len(sequence), 135, 3), dtype=np.float32)
        seq = np.vstack([sequence, pad])
    else:
        indices = np.linspace(0, len(sequence) - 1, WINDOW_SIZE, dtype=int)
        seq = sequence[indices]

    # Generate outputs
    out_seqs = [seq]
    out_labels = [class_name]
    
    if class_name != '_idle':
        # Apply augmentation directly here
        scale = np.random.uniform(0.9, 1.1)
        augmented = seq * scale
        noise = np.random.normal(0, 0.005, size=augmented.shape).astype(np.float32)
        augmented += noise
        
        out_seqs.append(augmented)
        out_labels.append(class_name)
        
    return out_seqs, out_labels

def main():
    classes = sorted([d for d in os.listdir(DATASET_DIR) if os.path.isdir(os.path.join(DATASET_DIR, d))])
    print(f"Classes ({len(classes)}): {classes}")
    
    tasks = []
    for class_name in classes:
        class_path = os.path.join(DATASET_DIR, class_name)
        videos = [v for v in os.listdir(class_path) if v.endswith('.mp4')]
        for v in videos:
            tasks.append((os.path.join(class_path, v), class_name))
            
    print(f"Total videos to process: {len(tasks)}")
    
    X, y = [], []
    
    # Use 10 cores out of 12 to leave the system perfectly responsive
    num_cores = max(1, mp_lib.cpu_count() - 2)
    print(f"Starting multiprocessing pool with {num_cores} workers...")
    
    with mp_lib.Pool(processes=num_cores, initializer=init_worker) as pool:
        for i, (out_seqs, out_labels) in enumerate(pool.imap_unordered(worker_process_video, tasks)):
            X.extend(out_seqs)
            y.extend(out_labels)
            
            if (i + 1) % 50 == 0 or (i + 1) == len(tasks):
                print(f"Processed {i + 1}/{len(tasks)} videos...")

    X = np.array(X, dtype=np.float32)
    y = np.array(y)

    print(f"\nExtraction complete. Total sequences: {X.shape[0]}")
    np.save('X.npy', X)
    np.save('y.npy', y)

if __name__ == '__main__':
    # Required for Windows multiprocessing
    mp_lib.freeze_support()
    main()