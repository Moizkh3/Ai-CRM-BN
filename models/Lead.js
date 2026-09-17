import mongoose from "mongoose";

const leadSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: [true, "Lead name is required"], trim: true },
    email: { type: String, trim: true, lowercase: true, default: "" },
    phone: { type: String, default: "" },
    company: { type: String, default: "" },
    status: {
      type: String,
      enum: ["New", "Contacted", "Qualified", "Proposal", "Won", "Lost"],
      default: "New",
    },
    priority: {
      type: String,
      enum: ["High", "Medium", "Low"],
      default: "Medium",
    },
    source: {
      type: String,
      enum: ["Website", "Referral", "Cold Outreach", "Event", "Social", "Other"],
      default: "Other",
    },
    value: { type: Number, default: 0, min: 0 },
    notes: { type: String, default: "" },
    tags: [{ type: String, trim: true }],
    order: { type: Number, default: 0 },
    aiSummary: { type: String, default: "" },
    aiRiskScore: { type: Number, default: null, min: 0, max: 100 },
  },
  { timestamps: true }
);

// Index for fast per-user queries
leadSchema.index({ user: 1, status: 1 });
leadSchema.index({ user: 1, createdAt: -1 });

const Lead = mongoose.model("Lead", leadSchema);
export default Lead;
