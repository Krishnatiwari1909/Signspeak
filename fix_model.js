import fs from "fs";

const path = "./public/models/asl/model.json";
const data = JSON.parse(fs.readFileSync(path, "utf8"));

// 1. Fix the Input Shape (Replace batch_shape with batchInputShape)
if (data.modelTopology.model_config.config.layers[0].class_name === "InputLayer") {
    data.modelTopology.model_config.config.layers[0].config.batchInputShape = [null, 30, 135, 3];
    delete data.modelTopology.model_config.config.layers[0].config.batch_shape;
}

// 2. The Topology Fix (Strips prefixes from inner layers)
data.modelTopology.model_config.config.layers.forEach(layer => {
    if (layer.class_name === "Bidirectional") {
        if (layer.config.layer && layer.config.layer.config.name) {
            layer.config.layer.config.name = layer.config.layer.config.name.replace(/^forward_/, "");
        }
        if (layer.config.backward_layer && layer.config.backward_layer.config.name) {
            layer.config.backward_layer.config.name = layer.config.backward_layer.config.name.replace(/^backward_/, "");
        }
    }
});

// 3. Map Keras 3 nested weight paths
data.weightsManifest[0].weights.forEach(w => {
    w.name = w.name
        .replace(/^sequential\//, "")
        .replace(/\/gru_cell\//g, "/");
});

fs.writeFileSync(path, JSON.stringify(data, null, 2));
console.log("✅ Final model.json fully mapped with topology and shape fixed!");