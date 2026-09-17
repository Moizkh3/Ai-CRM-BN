import express from "express";
import Task from "../models/Task.js";
import Lead from "../models/Lead.js";
import protect from "../middleware/auth.js";

const router = express.Router();
router.use(protect);

const leadLite = async (leadId, userId) => {
  const l = await Lead.findOne({ _id: leadId, user: userId }).select("name company");
  if (!l) return null;
  return { _id: l._id, name: l.name, company: l.company };
};

// GET /api/tasks
router.get("/", async (req, res, next) => {
  try {
    const tasks = await Task.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, count: tasks.length, tasks });
  } catch (err) {
    next(err);
  }
});

// POST /api/tasks
router.post("/", async (req, res, next) => {
  try {
    const { relatedLead: leadId, status, ...rest } = req.body;
    const relatedLead = leadId ? await leadLite(leadId, req.user._id) : null;
    const completedAt = status === "Completed" ? new Date() : null;
    const task = await Task.create({
      ...rest,
      status,
      relatedLead,
      completedAt,
      user: req.user._id,
    });
    res.status(201).json({ success: true, task });
  } catch (err) {
    next(err);
  }
});

// PUT /api/tasks/:id
router.put("/:id", async (req, res, next) => {
  try {
    const existing = await Task.findOne({ _id: req.params.id, user: req.user._id });
    if (!existing) return res.status(404).json({ success: false, message: "Task not found" });

    const { relatedLead: leadId, status, ...rest } = req.body;

    Object.assign(existing, rest);
    if (status !== undefined) existing.status = status;

    if ("relatedLead" in req.body) {
      existing.relatedLead = leadId ? await leadLite(leadId, req.user._id) : null;
    }

    if (status === "Completed" && !existing.completedAt) {
      existing.completedAt = new Date();
    } else if (status && status !== "Completed") {
      existing.completedAt = null;
    }

    await existing.save();
    res.json({ success: true, task: existing });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/tasks/:id
router.delete("/:id", async (req, res, next) => {
  try {
    const task = await Task.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!task) return res.status(404).json({ success: false, message: "Task not found" });
    res.json({ success: true, message: "Task deleted" });
  } catch (err) {
    next(err);
  }
});

export default router;
