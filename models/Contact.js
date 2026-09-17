import mongoose from "mongoose";

const contactSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: [true, "Contact name is required"], trim: true },
    title: { type: String, default: "" },
    company: { type: String, default: "" },
    email: { type: String, trim: true, lowercase: true, default: "" },
    phone: { type: String, default: "" },
    tags: [{ type: String, trim: true }],
    favorite: { type: Boolean, default: false },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

contactSchema.index({ user: 1, createdAt: -1 });

const Contact = mongoose.model("Contact", contactSchema);
export default Contact;
