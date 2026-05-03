const express = require("express");
const { body, validationResult } = require("express-validator");
const User = require("../models/User");
const { auth, adminOnly } = require("../middleware/auth");

const router = express.Router();
router.use(auth);

// GET /api/users/profile
router.get("/profile", async (req, res) => {
  res.json({ user: req.user });
});

// PATCH /api/users/profile
router.patch(
  "/profile",
  [
    body("name").optional().trim().isLength({ min: 2, max: 50 }),
    body("earThreshold").optional().isFloat({ min: 0.10, max: 0.40 }),
    body("marThreshold").optional().isFloat({ min: 0.40, max: 0.90 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    try {
      const allowed = ["name", "earThreshold", "marThreshold", "avatar"];
      const updates = {};
      allowed.forEach((key) => {
        if (req.body[key] !== undefined) updates[key] = req.body[key];
      });

      const user = await User.findByIdAndUpdate(req.user._id, updates, {
        new: true,
        runValidators: true,
      });
      res.json({ user });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// PATCH /api/users/change-password
router.patch(
  "/change-password",
  [
    body("currentPassword").notEmpty(),
    body("newPassword").isLength({ min: 6 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    try {
      const user = await User.findById(req.user._id).select("+password");
      const valid = await user.comparePassword(req.body.currentPassword);
      if (!valid) return res.status(401).json({ error: "Current password incorrect" });

      user.password = req.body.newPassword;
      user.passwordChangedAt = new Date();
      await user.save();

      res.json({ message: "Password updated successfully" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// GET /api/users — admin only
router.get("/", adminOnly, async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
