import fs from "fs";

const path = "./public/models/asl/model.json";
const data = JSON.parse(fs.readFileSync(path, "utf8"));

// 1. Fix the missing Input Shape
if (data.modelTopology.model_config.config.layers[0].class_name === "InputLayer") {
  data.modelTopology.model_config.config.layers[0].config.batchInputShape = [null, 30, 135, 3];
}

// 2. Map Keras 3 nested paths to exact TFJS target variables
data.weightsManifest[0].weights.forEach(w => {
  w.name = w.name
    .replace(/^sequential\//, "")
    .replace(/^time_distributed(?:_\d+)?\//, "")
    .replace(/^bidirectional(?:_\d+)?\//, "")
    .replace(/^forward_gru/, "forward_forward_gru")
    .replace(/^backward_gru/, "backward_backward_gru")
    .replace(/\/gru_cell\//, "/");
});

fs.writeFileSync(path, JSON.stringify(data, null, 2));
console.log("? Final model.json perfectly mapped for TFJS!");
