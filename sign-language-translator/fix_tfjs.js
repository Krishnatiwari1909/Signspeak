import fs from "fs";

const path = "./public/models/asl/model.json";
const data = JSON.parse(fs.readFileSync(path, "utf8"));

// Restore input shape
if (data.modelTopology.model_config.config.layers[0].class_name === "InputLayer") {
  data.modelTopology.model_config.config.layers[0].config.batchInputShape = [null, 30, 135, 3];
}

// Map Keras 3 paths to TFJS target variables
data.weightsManifest[0].weights.forEach(w => {
  w.name = w.name
    .replace(/^sequential\//, "")
    .replace(/\/gru_cell\//g, "/");
});

fs.writeFileSync(path, JSON.stringify(data, null, 2));
console.log("? Fresh model.json perfectly mapped!");
