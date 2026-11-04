import os
import json
import numpy as np
from scipy.interpolate import interp1d

CONVERSATIONAL_100 = [
    # 1. Greetings & Politeness (6)
    'HELLO', 'THANK_YOU', 'PLEASE', 'SORRY', 'YES', 'NO',
    
    # 2. Pronouns (5)
    'I', 'YOU', 'ME', 'MY', 'WE',
    
    # 3. Essential Verbs (28)
    'WANT', 'NEED', 'LIKE', 'LOVE', 'HAVE', 'EAT', 'DRINK', 'HELP', 'GO', 'COME',
    'SEE', 'KNOW', 'UNDERSTAND', 'WORK', 'PLAY', 'STOP', 'WAIT', 'MEET', 'CALL',
    'CHANGE', 'CHECK', 'LEAVE', 'FINISH', 'READ', 'WRITE', 'HEAR', 'THINK', 'GIVE',
    
    # 4. Questions (6)
    'WHAT', 'WHERE', 'WHEN', 'WHY', 'HOW', 'WHO',
    
    # 5. People & Roles (16)
    'MOTHER', 'FATHER', 'FAMILY', 'BROTHER', 'SISTER', 'COUSIN', 'FRIEND', 'TEACHER',
    'STUDENT', 'MAN', 'WOMAN', 'BOY', 'GIRL', 'BABY', 'PERSON', 'NAME',
    
    # 6. Places & Things (15)
    'FOOD', 'WATER', 'APPLE', 'CANDY', 'PIZZA', 'BED', 'COMPUTER', 'BOOK',
    'CAR', 'MONEY', 'SHIRT', 'ROOM', 'SCHOOL', 'HOME', 'PHONE',
    
    # 7. Descriptions (12)
    'GOOD', 'BAD', 'HAPPY', 'SAD', 'NICE', 'FINE', 'COLD', 'TALL',
    'SHORT', 'BIG', 'SMALL', 'TIRED',
    
    # 8. Time & Quantity (12)
    'TIME', 'TODAY', 'TOMORROW', 'YESTERDAY', 'BEFORE', 'LATER', 'NOW', 'AGAIN',
    'MORE', 'ALL', 'SOME', 'DAY'
]

def normalize_sequence(seq):
    """
    Normalizes a (30, 135, 3) sequence by shoulder distance.
    The sequence is already centered at shoulder midpoint.
    Pose landmarks 11 and 12 are left and right shoulders.
    """
    norm_seq = seq.copy()
    for t in range(seq.shape[0]):
        l_sh = seq[t, 11]
        r_sh = seq[t, 12]
        dist = np.linalg.norm(r_sh - l_sh)
        if dist > 0.05:
            # Scale so shoulder distance is standardized to 0.4
            scale = dist / 0.4
            norm_seq[t] = seq[t] / scale
    return norm_seq

def augment_temporal_speed(seq, speed_factor):
    """
    Simulates signing faster (speed > 1.0) or slower (speed < 1.0).
    seq shape: (30, 135, 3)
    """
    T = seq.shape[0]
    orig_times = np.linspace(0, 1, T)
    new_len = int(round(T / speed_factor))
    new_len = max(10, min(new_len, 50))
    
    # Resample
    f = interp1d(orig_times, seq, axis=0, kind='linear', fill_value='extrapolate')
    sampled = f(np.linspace(0, 1, new_len))
    
    # Fit back to T=30
    if new_len < T:
        # Padded at the end or centered
        pad_front = (T - new_len) // 2
        pad_back = T - new_len - pad_front
        out = np.zeros_like(seq)
        out[pad_front:pad_front + new_len] = sampled
        if pad_front > 0:
            out[:pad_front] = sampled[0]
        if pad_back > 0:
            out[-pad_back:] = sampled[-1]
        return out
    else:
        # Subsampled to 30
        idx = np.linspace(0, new_len - 1, T).astype(int)
        return sampled[idx]

def augment_spatial_and_noise(seq):
    """Applies slight translation, scaling, and hand landmark noise."""
    out = seq.copy()
    scale = np.random.uniform(0.92, 1.08)
    shift = np.random.uniform(-0.02, 0.02, size=(1, 1, 3))
    out = out * scale + shift
    
    # Hand landmarks are 33:75 (left hand 33:54, right hand 54:75)
    noise = np.random.normal(0, 0.003, size=(30, 42, 3))
    out[:, 33:75, :] += noise
    return out

def main():
    archive_dir = 'archive_2000_words_model'
    x_arch = os.path.join(archive_dir, 'X_2000.npy')
    y_arch = os.path.join(archive_dir, 'y_2000.npy')

    if not os.path.exists(x_arch) or not os.path.exists(y_arch):
        raise FileNotFoundError(f"Archive files not found in {archive_dir}")

    print("Loading labels from archive...")
    y_all = np.load(y_arch)
    
    target_classes = sorted(CONVERSATIONAL_100)
    print(f"Target vocabulary: {len(target_classes)} conversational words")

    mask = np.isin(y_all, target_classes)
    y_selected = list(y_all[mask])

    print("Loading feature slices with memory mapping...")
    X_all = np.load(x_arch, mmap_mode='r')
    X_raw = np.array(X_all[mask], dtype=np.float32)
    print(f"Loaded {len(y_selected)} raw samples across {len(set(y_selected))} classes.")

    print("\nNormalizing by shoulder distance and applying 4x data augmentation...")
    X_augmented = []
    y_augmented = []

    for idx in range(len(X_raw)):
        seq = normalize_sequence(X_raw[idx])
        label = y_selected[idx]
        
        # 1. Normalized original
        X_augmented.append(seq)
        y_augmented.append(label)
        
        # 2. Fast signing (1.3x speed)
        fast_seq = augment_temporal_speed(seq, speed_factor=1.3)
        X_augmented.append(fast_seq)
        y_augmented.append(label)
        
        # 3. Slow signing (0.8x speed)
        slow_seq = augment_temporal_speed(seq, speed_factor=0.8)
        X_augmented.append(slow_seq)
        y_augmented.append(label)
        
        # 4. Spatial scale/shift + hand noise
        noisy_seq = augment_spatial_and_noise(seq)
        X_augmented.append(noisy_seq)
        y_augmented.append(label)

    print(f"Augmented samples created: {len(y_augmented)}")

    # Generate synthetic _idle samples
    num_idle = 120
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
        y_augmented.append('_idle')

    X_final = np.vstack([np.array(X_augmented, dtype=np.float32), np.array(idle_samples, dtype=np.float32)])
    y_final = np.array(y_augmented)

    final_classes = sorted(list(set(y_final)))
    print(f"\nFinal dataset ready:")
    print(f"  Total samples: {len(X_final)}")
    print(f"  Total unique classes: {len(final_classes)} (100 conversational words + '_idle')")

    np.save('X.npy', X_final)
    np.save('y.npy', y_final)
    
    with open('labels.json', 'w') as f:
        json.dump(final_classes, f)
        
    print("Successfully saved X.npy, y.npy, and labels.json!")

if __name__ == '__main__':
    main()

