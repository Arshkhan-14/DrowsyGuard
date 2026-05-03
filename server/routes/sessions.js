const express = require("express");
const { v4: uuidv4 } = require("uuid");
const Session = require("../models/Session");
const User = require("../models/User");
const { auth } = require("../middleware/auth");

const router = express.Router();

// All routes require auth
router.use(auth);

// POST /api/sessions/start
router.post("/start", async (req, res) => {
  try {
    const sessionId = uuidv4();
    const session = await Session.create({
      userId: req.user._id,
      sessionId,
      status: "active",
    });

    // Increment user session count
    await User.findByIdAndUpdate(req.user._id, { $inc: { totalSessions: 1 } });

    res.status(201).json({ session, sessionId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/sessions/:sessionId/end
router.patch("/:sessionId/end", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const {
      totalFrames, totalBlinks, totalYawns, totalAlerts,
      drowsyFrames, drowsyPercentage, avgEar, minEar, maxEar,
      avgPitch, avgYaw, fatigueScore, lowAlerts, mediumAlerts, highAlerts,
      earTimeSeries, durationSeconds,
    } = req.body;

    const session = await Session.findOneAndUpdate(
      { sessionId, userId: req.user._id },
      {
        status: "completed",
        endedAt: new Date(),
        durationSeconds: durationSeconds || 0,
        totalFrames, totalBlinks, totalYawns, totalAlerts,
        drowsyFrames, drowsyPercentage, avgEar, minEar, maxEar,
        avgPitch, avgYaw, fatigueScore,
        lowAlerts, mediumAlerts, highAlerts,
        earTimeSeries: earTimeSeries?.slice(-300) || [], // cap at 300 points
      },
      { new: true }
    );

    if (!session) return res.status(404).json({ error: "Session not found" });

    // Update user aggregates
    await User.findByIdAndUpdate(req.user._id, {
      $inc: {
        totalDrivingTime: durationSeconds || 0,
        totalAlerts: totalAlerts || 0,
      },
    });

    res.json({ session });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/sessions — list user sessions
router.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const [sessions, total] = await Promise.all([
      Session.find({ userId: req.user._id })
        .sort({ startedAt: -1 })
        .skip(skip)
        .limit(limit)
        .select("-earTimeSeries"),
      Session.countDocuments({ userId: req.user._id }),
    ]);

    res.json({ sessions, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/sessions/:sessionId
router.get("/:sessionId", async (req, res) => {
  try {
    const session = await Session.findOne({
      sessionId: req.params.sessionId,
      userId: req.user._id,
    });
    if (!session) return res.status(404).json({ error: "Session not found" });
    res.json({ session });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
