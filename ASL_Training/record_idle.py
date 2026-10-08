import os
import cv2
import time

OUTPUT_DIR = os.path.join('dataset', '_idle')
os.makedirs(OUTPUT_DIR, exist_ok=True)

cap = cv2.VideoCapture(0)
cap.set(cv2.CAP_PROP_FPS, 30)

TOTAL_CLIPS = 30
FRAMES_PER_CLIP = 30

print("Ready to record _idle clips. Sit naturally in front of your webcam.")
print("Hands on lap, resting on desk, or moving slightly.")
time.sleep(2)

for clip_idx in range(TOTAL_CLIPS):
    print(f"Recording clip {clip_idx + 1}/{TOTAL_CLIPS} in 1 second...")
    time.sleep(1)
    
    frames = []
    while len(frames) < FRAMES_PER_CLIP:
        ret, frame = cap.read()
        if not ret:
            break
        frames.append(frame)

    if frames:
        out_path = os.path.join(OUTPUT_DIR, f"idle_{clip_idx:03d}.mp4")
        h, w, _ = frames[0].shape
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        out = cv2.VideoWriter(out_path, fourcc, 30.0, (w, h))
        for f in frames:
            out.write(f)
        out.release()

cap.release()
print(f"Done! Recorded {TOTAL_CLIPS} idle clips into '{OUTPUT_DIR}'.")