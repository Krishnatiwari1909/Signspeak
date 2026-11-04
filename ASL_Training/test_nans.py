import numpy as np
import onnxruntime as ort

onnx_path = r"C:\Foundational Project sem 5\ASL_Training\gislr_model\model.onnx"
session = ort.InferenceSession(onnx_path)
input_name = session.get_inputs()[0].name
output_name = session.get_outputs()[0].name

# Test 1: all zeros
in_zeros = np.zeros((30, 543, 3), dtype=np.float32)
out_zeros = session.run([output_name], {input_name: in_zeros})[0]
print("Zeros output finite:", np.all(np.isfinite(out_zeros)), "Shape:", out_zeros.shape)

# Test 2: all NaNs
in_nans = np.full((30, 543, 3), np.nan, dtype=np.float32)
out_nans = session.run([output_name], {input_name: in_nans})[0]
print("NaNs output finite:", np.all(np.isfinite(out_nans)), "Shape:", out_nans.shape)

# Test 3: Realistic sequence where face has coords ~0.5, pose ~0.5, right hand has coords ~0.5, left hand is NaN
realistic = np.full((30, 543, 3), np.nan, dtype=np.float32)
realistic[:, :468, :] = 0.5 # face
realistic[:, 489:522, :] = 0.5 # pose
realistic[:, 522:543, :] = 0.5 # right hand
out_real = session.run([output_name], {input_name: realistic})[0]
print("Realistic output finite:", np.all(np.isfinite(out_real)), "Top 3:", np.argsort(out_real)[-3:][::-1])

