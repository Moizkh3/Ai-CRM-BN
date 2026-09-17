import express from "express";
import Contact from "../models/Contact.js";
import protect from "../middleware/auth.js";

const router = express.Router();
router.use(protect);

// GET /api/contacts
router.get("/", async (req, res, next) => {
  try {
    const contacts = await Contact.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, count: contacts.length, contacts });
  } catch (err) {
    next(err);
  }
});

// GET /api/contacts/:id
router.get("/:id", async (req, res, next) => {
  try {
    const contact = await Contact.findOne({ _id: req.params.id, user: req.user._id });
    if (!contact) return res.status(404).json({ success: false, message: "Contact not found" });
    res.json({ success: true, contact });
  } catch (err) {
    next(err);
  }
});

// POST /api/contacts
router.post("/", async (req, res, next) => {
  try {
    const contact = await Contact.create({ ...req.body, user: req.user._id });
    res.status(201).json({ success: true, contact });
  } catch (err) {
    next(err);
  }
});

// PUT /api/contacts/:id
router.put("/:id", async (req, res, next) => {
  try {
    const contact = await Contact.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!contact) return res.status(404).json({ success: false, message: "Contact not found" });
    res.json({ success: true, contact });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/contacts/:id
router.delete("/:id", async (req, res, next) => {
  try {
    const contact = await Contact.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!contact) return res.status(404).json({ success: false, message: "Contact not found" });
    res.json({ success: true, message: "Contact deleted" });
  } catch (err) {
    next(err);
  }
});

export default router;
