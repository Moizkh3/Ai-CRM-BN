import express from "express";
import Lead from "../models/Lead.js";
import protect from "../middleware/auth.js";

const router = express.Router();
router.use(protect);

// GET /api/leads
router.get("/", async (req, res, next) => {
  try {
    const leads = await Lead.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, count: leads.length, leads });
  } catch (err) {
    next(err);
  }
});

// GET /api/leads/:id
router.get("/:id", async (req, res, next) => {
  try {
    const lead = await Lead.findOne({ _id: req.params.id, user: req.user._id });
    if (!lead) return res.status(404).json({ success: false, message: "Lead not found" });
    res.json({ success: true, lead });
  } catch (err) {
    next(err);
  }
});

// POST /api/leads
router.post("/", async (req, res, next) => {
  try {
    const lead = await Lead.create({ ...req.body, user: req.user._id });
    res.status(201).json({ success: true, lead });
  } catch (err) {
    next(err);
  }
});

// PUT /api/leads/:id
router.put("/:id", async (req, res, next) => {
  try {
    const lead = await Lead.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!lead) return res.status(404).json({ success: false, message: "Lead not found" });
    res.json({ success: true, lead });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/leads/:id
router.delete("/:id", async (req, res, next) => {
  try {
    const lead = await Lead.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!lead) return res.status(404).json({ success: false, message: "Lead not found" });
    res.json({ success: true, message: "Lead deleted" });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/leads/reorder  — bulk update status + order for the Kanban board
router.patch("/reorder", async (req, res, next) => {
  try {
    const { updates } = req.body; // [{ id, status, order }]
    if (!Array.isArray(updates)) {
      return res.status(400).json({ success: false, message: "updates must be an array" });
    }
    const ops = updates.map((u) => ({
      updateOne: {
        filter: { _id: u.id, user: req.user._id },
        update: { status: u.status, order: u.order },
      },
    }));
    await Lead.bulkWrite(ops);
    res.json({ success: true, message: "Pipeline updated" });
  } catch (err) {
    next(err);
  }
});

export default router;
