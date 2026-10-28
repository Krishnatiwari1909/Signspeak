import os
import json
import numpy as np

def prepare_dataset(num_classes=50, num_idle=40):
    archive_dir = 'archive_2000_words_model'
    x_arch = os.path.join(archive_dir, 'X_2000.npy')
    y_arch = os.path.join(archive_dir, 'y_2000.npy')

    if not os.path.exists(x_arch) or not os.path.exists(y_arch):
        raise FileNotFoundError(f"Archive files not found in {archive_dir}")

    print("Loading labels from archive...")
    y_all = np.load(y_arch)
    unique_labels, counts = np.unique(y_all, return_counts=True)
    sorted_pairs = sorted(zip(unique_labels, counts), key=lambda x: x[1], reverse=True)
    
    top_classes = [lbl for lbl, _ in sorted_pairs[:num_classes]]
    print(f"Selected Top {num_classes} classes by sample count:")
    for idx, (lbl, cnt) in enumerate(sorted_pairs[:num_classes], 1):
        print(f"  {idx:2d}. {lbl:<15} ({cnt} samples)")

    top_class_set = set(top_classes)
    mask = np.isin(y_all, top_classes)

    print("Loading feature slices with memory mapping...")
    X_all = np.load(x_arch, mmap_mode='r')
    X_selected = np.array(X_all[mask], dtype=np.float32)
    y_selected = list(y_all[mask])

    print(f"Extracted {len(y_selected)} samples for the top {num_classes} signs.")

    # Generate _idle samples
    print(f"Generating {num_idle} synthetic _idle samples...")
    idle_samples = []
    for s in range(num_idle):
        seq = np.zeros((30, 135, 3), dtype=np.float32)
        drift_x = np.random.uniform(-0.02, 0.02)
        drift_y = np.random.uniform(-0.02, 0.02)
        
        base_pose = np.zeros((33, 3), dtype=np.float32)
        base_pose[11] = [0.2 + drift_x, drift_y, 0.0]
        base_pose[12] = [-0.2 + drift_x, drift_y, 0.0]
        base_pose[0] = [drift_x, -0.25 + drift_y, 0.0]
        
        has_hands = (s % 2 == 0)
        base_lhand = np.zeros((21, 3), dtype=np.float32)
        base_rhand = np.zeros((21, 3), dtype=np.float32)
        if has_hands:
            base_lhand[:, :] = [0.25 + drift_x, 0.5 + drift_y, 0.0]
            base_rhand[:, :] = [-0.25 + drift_x, 0.5 + drift_y, 0.0]
            
        for t in range(30):
            b_factor = np.sin(2 * np.pi * t / 30.0) * 0.005
            seq[t, :33, :] = base_pose + np.random.normal(0, 0.002, (33, 3)) + [0, b_factor, 0]
            if has_hands:
                seq[t, 33:54, :] = base_lhand + np.random.normal(0, 0.002, (21, 3))
                seq[t, 54:75, :] = base_rhand + np.random.normal(0, 0.002, (21, 3))
            seq[t, 75:, :] = [drift_x, -0.25 + drift_y + b_factor, 0.0] + np.random.normal(0, 0.002, (60, 3))
            
        idle_samples.append(seq)
        y_selected.append('_idle')

    X_final = np.vstack([X_selected, np.array(idle_samples, dtype=np.float32)])
    y_final = np.array(y_selected)

    print(f"\nFinal dataset ready:")
    print(f"  X shape: {X_final.shape}")
    print(f"  y shape: {y_final.shape}")
    print(f"  Total unique classes: {len(np.unique(y_final))}")

    np.save('X.npy', X_final)
    np.save('y.npy', y_final)
    print("Successfully saved X.npy and y.npy!")

if __name__ == '__main__':
    prepare_dataset(num_classes=50, num_idle=40)
