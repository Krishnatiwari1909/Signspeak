import onnx

model = onnx.load(r"C:\Foundational Project sem 5\ASL_Training\gislr_model\model.onnx")
graph = model.graph

print("Inputs:")
for inp in graph.input:
    print(" ", inp.name, [d.dim_value or d.dim_param for d in inp.type.tensor_type.shape.dim])

print("\nFirst 20 nodes:")
for node in graph.node[:20]:
    print(f"  {node.op_type} ({node.name}): inputs={node.input[:3]}, outputs={node.output}")

