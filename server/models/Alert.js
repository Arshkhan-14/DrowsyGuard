const mongoose = require("mongoose");

const alertSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Session",
      required: true,
      index: true,
    },
    sessionStringId: { type: String, index: true },
    level: {
      type: String,
      enum: ["low", "medium", "high"],
      required: true,
    },
    trigger: {
      type: String,
      enum: ["eyes_closed", "yawning", "head_tilt", "combined", "blink_rate"],
      required: true,
    },
    ear: { type: Number },
    mar: { type: Number },
    drowsinessScore: { type: Number },
    pitch: { type: Number },
    yaw: { type: Number },
    acknowledged: { type: Boolean, default: false },
    acknowledgedAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

// TTL index — keep alerts for 90 days
alertSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 3600 });

module.exports = mongoose.model("Alert", alertSchema);
