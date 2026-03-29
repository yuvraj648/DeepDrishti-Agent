const mongoose = require('mongoose');

const stationSettingsSchema = new mongoose.Schema(
  {
    enhancementStrength: { type: Number, default: 75 },
    dehazeFactor: { type: Number, default: 42 },
    colorCorrection: { type: Boolean, default: true },
    lowLightBoost: { type: Boolean, default: false },
    waterTurbidity: { type: String, default: 'Deep Sea / Blue Water' },
    confidenceThreshold: { type: Number, default: 0.85 },
    debrisDetection: { type: Boolean, default: true },
    diverRecognition: { type: Boolean, default: true },
    subsurfaceDetection: { type: Boolean, default: true },
    exclusionList: { type: [String], default: ['Fish Shoals', 'Sea Kelp'] },
    autoAlertCommand: { type: Boolean, default: true },
    soundNotification: { type: Boolean, default: true },
    countThreshold: { type: Number, default: 3 },
    cooldown: { type: Number, default: 120 },
    fpsLimit: { type: String, default: '30 FPS' },
    recordRawStream: { type: Boolean, default: false },
    enhancedArchiving: { type: Boolean, default: true },
    aiModel: { type: String, default: 'NEPTUNE-v4.2.0-STABLE' },
    visionEngine: { type: String, default: 'CUDA-ACCELERATED-V3' },
  },
  { timestamps: true }
);

stationSettingsSchema.statics.getSingleton = async function getSingleton() {
  let doc = await this.findOne();
  if (!doc) {
    doc = await this.create({});
  }
  return doc;
};

module.exports = mongoose.model('StationSettings', stationSettingsSchema);
