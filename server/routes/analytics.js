const express = require("express");
const Session = require("../models/Session");
const Alert = require("../models/Alert");
const { auth } = require("../middleware/auth");

const router = express.Router();
router.use(auth);

// GET /api/analytics/overview
router.get("/overview", async (req, res) => {
  try {
    const userId = req.user._id;

    const [sessions, alerts, aggResult] = await Promise.all([
      Session.find({ userId, status: "completed" }).sort({ startedAt: -1 }).limit(10),
      Alert.countDocuments({ userId }),
      Session.aggregate([
        { $match: { userId, status: "completed" } },
        {
          $group: {
            _id: null,
            totalSessions: { $sum: 1 },
            totalDriving: { $sum: "$durationSeconds" },
            avgFatigue: { $avg: "$fatigueScore" },
            avgEar: { $avg: "$avgEar" },
            totalAlerts: { $sum: "$totalAlerts" },
            totalBlinks: { $sum: "$totalBlinks" },
            totalYawns: { $sum: "$totalYawns" },
          },
        },
      ]),
    ]);

    const agg = aggResult[0] || {};

    res.json({
      overview: {
        totalSessions: agg.totalSessions || 0,
        totalDrivingSeconds: agg.totalDriving || 0,
        avgFatigueScore: Math.round(agg.avgFatigue || 0),
        avgEar: Math.round((agg.avgEar || 0) * 1000) / 1000,
        totalAlerts: agg.totalAlerts || 0,
        totalBlinks: agg.totalBlinks || 0,
        totalYawns: agg.totalYawns || 0,
      },
      recentSessions: sessions,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/analytics/alerts-trend?days=7
router.get("/alerts-trend", async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const since = new Date(Date.now() - days * 24 * 3600 * 1000);

    const trend = await Alert.aggregate([
      { $match: { userId: req.user._id, createdAt: { $gte: since } } },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            level: "$level",
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.date": 1 } },
    ]);

    res.json({ trend, days });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/analytics/ear-history
router.get("/ear-history", async (req, res) => {
  try {
    const sessions = await Session.find({
      userId: req.user._id,
      status: "completed",
    })
      .sort({ startedAt: -1 })
      .limit(5)
      .select("sessionId startedAt avgEar minEar fatigueScore earTimeSeries");

    res.json({ sessions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/analytics/driver-score
router.get("/driver-score", async (req, res) => {
  try {
    const sessions = await Session.find({
      userId: req.user._id,
      status: "completed",
    })
      .sort({ startedAt: -1 })
      .limit(30)
      .select("startedAt fatigueScore totalAlerts drowsyPercentage driverScore");

    const scores = sessions.map((s) => ({
      date: s.startedAt,
      fatigueScore: s.fatigueScore,
      totalAlerts: s.totalAlerts,
      drowsyPercentage: s.drowsyPercentage,
      driverScore: s.driverScore,
    }));

    res.json({ scores });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
