import onnx
from onnx import numpy_helper

model = onnx.load(r"C:\Foundational Project sem 5\ASL_Training\gislr_model\model.onnx")
weights = {t.name: numpy_helper.to_array(t) for t in model.graph.initializer}

for name in ['preprocess/GatherV2/indices', 'preprocess/GatherV2_1/indices']:
    if name in weights:
        arr = weights[name]
        print(f"{name}: shape={arr.shape}, values={arr[:10]}... max={arr.max()}, min={arr.min()}")

