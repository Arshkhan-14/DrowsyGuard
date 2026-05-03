const mongoose = require("mongoose");

const sessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["active", "completed", "interrupted"],
      default: "active",
    },
    startedAt: { type: Date, default: Date.now },
    endedAt: { type: Date },
    durationSeconds: { type: Number, default: 0 },

    // Metrics summary
    totalFrames: { type: Number, default: 0 },
    totalBlinks: { type: Number, default: 0 },
    totalYawns: { type: Number, default: 0 },
    totalAlerts: { type: Number, default: 0 },
    drowsyFrames: { type: Number, default: 0 },
    drowsyPercentage: { type: Number, default: 0 },

    // EAR stats
    avgEar: { type: Number, default: 0 },
    minEar: { type: Number, default: 0 },
    maxEar: { type: Number, default: 0 },

    // Head pose stats
    avgPitch: { type: Number, default: 0 },
    avgYaw: { type: Number, default: 0 },

    // Fatigue score
    fatigueScore: { type: Number, default: 0 },

    // Alert breakdown
    lowAlerts: { type: Number, default: 0 },
    mediumAlerts: { type: Number, default: 0 },
    highAlerts: { type: Number, default: 0 },

    // EAR time series (sampled every 5s for analytics)
    earTimeSeries: [
      {
        t: Number, // timestamp offset (seconds from start)
        v: Number, // EAR value
      },
    ],

    notes: { type: String },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

sessionSchema.virtual("driverScore").get(function () {
  // Lower alert rate and drowsy% → higher score
  const alertPenalty = Math.min(this.totalAlerts * 2, 40);
  const drowsyPenalty = this.drowsyPercentage * 0.4;
  return Math.max(0, Math.round(100 - alertPenalty - drowsyPenalty));
});

module.exports = mongoose.model("Session", sessionSchema);
