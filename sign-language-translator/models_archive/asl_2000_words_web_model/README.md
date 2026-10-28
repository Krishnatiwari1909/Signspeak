# ASL 2,000-Words Web Model Archive

This folder contains the complete TensorFlow.js converted model and label mappings for the 2,000-word WLASL sign language classifier.

## Files
- `model.json`: TensorFlow.js LayersModel topology and weights manifest.
- `group1-shard1of4.bin` to `group1-shard4of4.bin`: Binary weight shards.
- `labels.json`: The 2,000 sign labels.

## To Restore
Copy these files into `public/models/asl/` whenever you wish to use the 2,000-word model in the frontend app.
