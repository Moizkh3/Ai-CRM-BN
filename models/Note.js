import mongoose from "mongoose";

// Lightweight embedded sub-doc for lead/contact references in notes
const refSchema = new mongoose.Schema(
  { _id: mongoose.Schema.Types.ObjectId, name: String, company: String },
  { _id: false }
);

const noteSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String, required: [true, "Note content is required"], trim: true },
    lead: { type: refSchema, default: null },
    contact: { type: refSchema, default: null },
    pinned: { type: Boolean, default: false },
  },
  { timestamps: true }
);

noteSchema.index({ user: 1, pinned: -1, createdAt: -1 });

const Note = mongoose.model("Note", noteSchema);
export default Note;
