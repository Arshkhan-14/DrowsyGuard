const express = require("express");
const Alert = require("../models/Alert");
const Session = require("../models/Session");
const { auth } = require("../middleware/auth");

const router = express.Router();
router.use(auth);

// POST /api/alerts — log an alert event
router.post("/", async (req, res) => {
  try {
    const { sessionId, sessionStringId, level, trigger, ear, mar, drowsinessScore, pitch, yaw } = req.body;

    const alert = await Alert.create({
      userId: req.user._id,
      sessionId,
      sessionStringId,
      level,
      trigger,
      ear,
      mar,
      drowsinessScore,
      pitch,
      yaw,
    });

    res.status(201).json({ alert });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/alerts — list user alerts with filters
router.get("/", async (req, res) => {
  try {
    const { level, sessionId, from, to, page = 1, limit = 20 } = req.query;
    const filter = { userId: req.user._id };

    if (level) filter.level = level;
    if (sessionId) filter.sessionStringId = sessionId;
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [alerts, total] = await Promise.all([
      Alert.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      Alert.countDocuments(filter),
    ]);

    res.json({ alerts, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/alerts/:id/acknowledge
router.patch("/:id/acknowledge", async (req, res) => {
  try {
    const alert = await Alert.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { acknowledged: true, acknowledgedAt: new Date() },
      { new: true }
    );
    if (!alert) return res.status(404).json({ error: "Alert not found" });
    res.json({ alert });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
