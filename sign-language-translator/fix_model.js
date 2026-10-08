import fs from 'fs';

const path = './public/models/asl/model.json';
const data = JSON.parse(fs.readFileSync(path, 'utf8'));

// Fix Bidirectional nested layer names so TFJS's prefixing matches the weight manifest
data.modelTopology.model_config.config.layers.forEach(layer => {
  if (layer.class_name === 'Bidirectional') {
    if (layer.config.layer && layer.config.layer.config.name) {
      layer.config.layer.config.name = layer.config.layer.config.name.replace(/^forward_/, '');
    }
    if (layer.config.backward_layer && layer.config.backward_layer.config.name) {
      layer.config.backward_layer.config.name = layer.config.backward_layer.config.name.replace(/^backward_/, '');
    }
  }
});

fs.writeFileSync(path, JSON.stringify(data, null, 2));
console.log("Fixed model.json topology!");
