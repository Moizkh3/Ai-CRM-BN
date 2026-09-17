import express from "express";
import Note from "../models/Note.js";
import Lead from "../models/Lead.js";
import protect from "../middleware/auth.js";

const router = express.Router();
router.use(protect);

const leadLite = async (leadId, userId) => {
  const l = await Lead.findOne({ _id: leadId, user: userId }).select("name company");
  if (!l) return null;
  return { _id: l._id, name: l.name, company: l.company };
};

// GET /api/notes — pinned first, then newest
router.get("/", async (req, res, next) => {
  try {
    const notes = await Note.find({ user: req.user._id }).sort({ pinned: -1, createdAt: -1 });
    res.json({ success: true, count: notes.length, notes });
  } catch (err) {
    next(err);
  }
});

// POST /api/notes
router.post("/", async (req, res, next) => {
  try {
    const { content, lead: leadId, pinned } = req.body;
    const lead = leadId ? await leadLite(leadId, req.user._id) : null;
    const note = await Note.create({ user: req.user._id, content, lead, pinned: !!pinned });
    res.status(201).json({ success: true, note });
  } catch (err) {
    next(err);
  }
});

// PUT /api/notes/:id
router.put("/:id", async (req, res, next) => {
  try {
    const existing = await Note.findOne({ _id: req.params.id, user: req.user._id });
    if (!existing) return res.status(404).json({ success: false, message: "Note not found" });

    const { content, lead: leadId, pinned } = req.body;
    if (content !== undefined) existing.content = content;
    if (pinned !== undefined) existing.pinned = pinned;
    if ("lead" in req.body) {
      existing.lead = leadId ? await leadLite(leadId, req.user._id) : null;
    }
    await existing.save();
    res.json({ success: true, note: existing });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/notes/:id
router.delete("/:id", async (req, res, next) => {
  try {
    const note = await Note.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!note) return res.status(404).json({ success: false, message: "Note not found" });
    res.json({ success: true, message: "Note deleted" });
  } catch (err) {
    next(err);
  }
});

export default router;
