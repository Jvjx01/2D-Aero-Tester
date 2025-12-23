import mongoose from 'mongoose';

const TestSchema = new mongoose.Schema({
  shape: {
    type: {
      type: String,
      default: 'polygon'
    },
    points: {
      type: [[Number]], // Array of [x, y] arrays
      required: true
    }
  },
  parameters: {
    windSpeed: { type: Number, required: true },
    angle: { type: Number, required: true },
    airDensity: { type: Number, required: true }
  },
  results: {
    area: { type: Number, required: true },
    cd: { type: Number, required: true },
    cl: { type: Number, required: false }, // Optional for backward compatibility
    dragForce: { type: Number, required: true },
    liftForce: { type: Number, required: false } // Optional
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('Test', TestSchema);
