# ASL 2000-Words Model Archive

This folder preserves all training files, preprocessed feature arrays, and model checkpoints from the full 2,000-word WLASL model trained on October 9, 2026.

## Contents
- `asl_model_2000.h5`: Full Keras model trained across 2,000 ASL classes for 80 epochs.
- `asl_model_checkpoint_2000.h5`: Model weights checkpoint with best validation accuracy (~59.97%).
- `labels_2000.json`: Complete JSON array of all 2,000 vocabulary words in categorical index order.
- `X_2000.npy`: Preprocessed input feature tensor array (`(11979, 30, 135, 3)` - 135 landmarks normalized to shoulder origin over 30-frame rolling windows).
- `y_2000.npy`: Ground truth categorical labels array (`(11979,)`).

## Specifications
- Architecture: TimeDistributed Conv1D + BatchNorm + MaxPooling + Bidirectional GRU (128 units) + Bidirectional GRU (64 units) + Dense (128) + Softmax (2000 classes).
- Epochs: 80
- Batch size: 128
- Final Validation Accuracy: 59.97%
