const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: 2,
      maxlength: 50,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Invalid email format"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 6,
      select: false,
    },
    role: {
      type: String,
      enum: ["driver", "admin"],
      default: "driver",
    },
    // Adaptive thresholds per user
    earThreshold: {
      type: Number,
      default: 0.22,
      min: 0.10,
      max: 0.40,
    },
    marThreshold: {
      type: Number,
      default: 0.65,
      min: 0.40,
      max: 0.90,
    },
    // Driver scoring
    driverScore: {
      type: Number,
      default: 100,
      min: 0,
      max: 100,
    },
    totalSessions: { type: Number, default: 0 },
    totalDrivingTime: { type: Number, default: 0 }, // seconds
    totalAlerts: { type: Number, default: 0 },
    avatar: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date },
    passwordChangedAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Hash password before save
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password
userSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

// Virtual: fatigue risk level
userSchema.virtual("fatigueRiskLevel").get(function () {
  if (this.driverScore >= 80) return "low";
  if (this.driverScore >= 60) return "medium";
  return "high";
});

module.exports = mongoose.model("User", userSchema);
