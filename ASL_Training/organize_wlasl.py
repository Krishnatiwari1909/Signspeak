import os
import json
import shutil

JSON_PATH = 'WLASL_v0.3.json'
VIDEOS_DIR = 'videos'
DATASET_DIR = 'dataset'

os.makedirs(DATASET_DIR, exist_ok=True)

with open(JSON_PATH, 'r') as f:
    data = json.load(f)

NUM_CLASSES = len(data) # Update to total number of words

# Sort words by total video samples available (most samples first)
sorted_glosses = sorted(data, key=lambda x: len(x['instances']), reverse=True)[:NUM_CLASSES]

print(f"Organizing all {NUM_CLASSES} classes...")

total_copied = 0
for entry in sorted_glosses:
    gloss = entry['gloss'].upper().replace(' ', '_')
    gloss_dir = os.path.join(DATASET_DIR, gloss)
    os.makedirs(gloss_dir, exist_ok=True)

    for inst in entry['instances']:
        video_id = inst['video_id']
        src_path = os.path.join(VIDEOS_DIR, f"{video_id}.mp4")
        dst_path = os.path.join(gloss_dir, f"{video_id}.mp4")

        if os.path.exists(src_path) and not os.path.exists(dst_path):
            shutil.copyfile(src_path, dst_path)
            total_copied += 1

print(f"Copied {total_copied} videos across {NUM_CLASSES} classes into '{DATASET_DIR}/'.")