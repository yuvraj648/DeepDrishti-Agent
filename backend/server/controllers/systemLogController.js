const SystemLog = require('../models/SystemLog');

exports.ensureSampleLogs = async () => {
  try {
    const n = await SystemLog.countDocuments();
    if (n > 0) return;
    await SystemLog.insertMany([
      {
        severity: 'INFO',
        module: 'SYS-KERNEL',
        message: 'AquaScope log bus online | Mongo sink ready',
      },
      {
        severity: 'INFO',
        module: 'AI-DETECTOR',
        message: 'Inference worker idle | awaiting frame queue',
      },
      {
        severity: 'WARN',
        module: 'COMM-RELAY',
        message: 'Handshake monitor active | nominal latency',
      },
    ]);
  } catch (e) {
    console.warn('ensureSampleLogs:', e.message);
  }
};

exports.listLogs = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 200, 500);
    const skip = parseInt(req.query.skip, 10) || 0;
    const severity = req.query.severity;
    const moduleFilter = req.query.module;
    const q = req.query.q;

    const filter = {};
    if (severity && severity !== 'all') {
      filter.severity = String(severity).toUpperCase();
    }
    if (moduleFilter && moduleFilter !== 'ALL SYSTEMS') {
      filter.module = new RegExp(moduleFilter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    }
    if (q && q.trim()) {
      filter.$or = [
        { message: new RegExp(q.trim(), 'i') },
        { module: new RegExp(q.trim(), 'i') },
      ];
    }

    const [items, total] = await Promise.all([
      SystemLog.find(filter).sort({ timestamp: -1 }).skip(skip).limit(limit).lean(),
      SystemLog.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: items,
      pagination: { total, limit, skip },
    });
  } catch (error) {
    console.error('listLogs', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.appendLog = async (req, res) => {
  try {
    const { severity = 'INFO', module: mod, message, meta } = req.body || {};
    if (!mod || !message) {
      return res.status(400).json({ success: false, message: 'module and message required' });
    }
    const row = await SystemLog.create({
      severity: String(severity).toUpperCase(),
      module: mod,
      message: String(message).slice(0, 2000),
      meta,
    });
    res.status(201).json({ success: true, data: row });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
