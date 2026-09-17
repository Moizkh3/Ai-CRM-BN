import mongoose from "mongoose";

const leadRefSchema = new mongoose.Schema(
  { _id: mongoose.Schema.Types.ObjectId, name: String, company: String },
  { _id: false }
);

const taskSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: [true, "Task title is required"], trim: true },
    description: { type: String, default: "" },
    dueDate: { type: Date, default: null },
    status: {
      type: String,
      enum: ["Pending", "In Progress", "Completed"],
      default: "Pending",
    },
    priority: {
      type: String,
      enum: ["High", "Medium", "Low"],
      default: "Medium",
    },
    relatedLead: { type: leadRefSchema, default: null },
    relatedContact: { type: leadRefSchema, default: null },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

taskSchema.index({ user: 1, status: 1, dueDate: 1 });

const Task = mongoose.model("Task", taskSchema);
export default Task;
