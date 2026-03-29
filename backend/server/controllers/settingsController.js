const StationSettings = require('../models/StationSettings');
const SystemLog = require('../models/SystemLog');

const ALLOWED_KEYS = new Set([
  'enhancementStrength',
  'dehazeFactor',
  'colorCorrection',
  'lowLightBoost',
  'waterTurbidity',
  'confidenceThreshold',
  'debrisDetection',
  'diverRecognition',
  'subsurfaceDetection',
  'exclusionList',
  'autoAlertCommand',
  'soundNotification',
  'countThreshold',
  'cooldown',
  'fpsLimit',
  'recordRawStream',
  'enhancedArchiving',
  'aiModel',
  'visionEngine',
]);

exports.getSettings = async (req, res) => {
  try {
    const doc = await StationSettings.getSingleton();
    const o = doc.toObject();
    delete o.__v;
    res.json({ success: true, data: o });
  } catch (error) {
    console.error('getSettings', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    const patch = req.body || {};
    const updates = {};
    for (const key of Object.keys(patch)) {
      if (ALLOWED_KEYS.has(key)) {
        updates[key] = patch[key];
      }
    }
    let doc = await StationSettings.getSingleton();
    Object.assign(doc, updates);
    if (Object.prototype.hasOwnProperty.call(updates, 'exclusionList')) {
      doc.markModified('exclusionList');
    }
    await doc.save();
    const o = doc.toObject();
    delete o.__v;
    try {
      await SystemLog.create({
        severity: 'INFO',
        module: 'SYS-KERNEL',
        message: `Station settings updated by ${req.user?.email || 'user'} (${Object.keys(updates).length} fields)`,
        meta: { keys: Object.keys(updates) },
      });
    } catch (e) {
      console.warn('updateSettings log:', e.message);
    }
    res.json({ success: true, data: o });
  } catch (error) {
    console.error('updateSettings', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
