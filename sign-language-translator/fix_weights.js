import fs from 'fs';

const path = './public/models/asl/model.json';
const data = JSON.parse(fs.readFileSync(path, 'utf8'));

// Fix input shape
if (data.modelTopology.model_config.config.layers[0].class_name === 'InputLayer') {
  data.modelTopology.model_config.config.layers[0].config.batchInputShape = [null, 30, 135, 3];
}

// Fix weight paths
data.weightsManifest[0].weights.forEach(w => {
  w.name = w.name
    .replace(/^sequential\//, '')    // Remove top-level sequential prefix
    .replace(/\/gru_cell\//g, '/');  // Remove Keras 3 internal gru_cell path
});

fs.writeFileSync(path, JSON.stringify(data, null, 2));
console.log("? Final model.json perfectly aligned!");
