import express from "express";
import Lead from "../models/Lead.js";
import Contact from "../models/Contact.js";
import Task from "../models/Task.js";
import protect from "../middleware/auth.js";

const router = express.Router();
router.use(protect);

// GET /api/analytics/overview
router.get("/overview", async (req, res, next) => {
  try {
    const uid = req.user._id;

    const [leads, contacts, tasks] = await Promise.all([
      Lead.find({ user: uid }),
      Contact.countDocuments({ user: uid }),
      Task.find({ user: uid }),
    ]);

    // ── Stage breakdown ──────────────────────────────────────────────────────
    const STAGES = ["New", "Contacted", "Qualified", "Proposal", "Won", "Lost"];
    const byStage = Object.fromEntries(STAGES.map((s) => [s, { count: 0, value: 0 }]));

    let totalValue = 0;
    let wonValue = 0;

    for (const l of leads) {
      const b = byStage[l.status] ?? (byStage[l.status] = { count: 0, value: 0 });
      b.count++;
      b.value += l.value || 0;
      totalValue += l.value || 0;
      if (l.status === "Won") wonValue += l.value || 0;
    }

    const won = byStage.Won.count;
    const lost = byStage.Lost.count;
    const closed = won + lost;
    const conversionRate = closed ? Math.round((won / closed) * 100) : 0;

    // ── 6-month trend ────────────────────────────────────────────────────────
    const MONTH_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const now = new Date();
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: MONTH_LABELS[d.getMonth()] });
    }
    const idx = Object.fromEntries(months.map((m, i) => [m.key, i]));
    const trend = months.map((m) => ({ month: m.label, leads: 0, won: 0 }));

    for (const l of leads) {
      const d = new Date(l.createdAt);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (idx[key] !== undefined) {
        trend[idx[key]].leads++;
        if (l.status === "Won") trend[idx[key]].won += l.value || 0;
      }
    }

    // ── Lead sources breakdown ────────────────────────────────────────────────
    const sourceMap = {};
    for (const l of leads) {
      sourceMap[l.source] = (sourceMap[l.source] || 0) + 1;
    }
    const leadsBySource = Object.entries(sourceMap).map(([source, count]) => ({ source, count }));

    // ── Recent leads ─────────────────────────────────────────────────────────
    const recentLeads = [...leads]
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      .slice(0, 6)
      .map((l) => ({
        id: l._id,
        name: l.name,
        company: l.company,
        status: l.status,
        value: l.value,
        updatedAt: l.updatedAt,
      }));

    res.json({
      success: true,
      stats: {
        revenueWon: wonValue,
        pipelineValue: totalValue,
        totalLeads: leads.length,
        totalContacts: contacts,
        openTasks: tasks.filter((t) => t.status !== "Completed").length,
        conversionRate,
      },
      pipeline: STAGES.map((s) => ({
        stage: s,
        count: byStage[s]?.count || 0,
        value: byStage[s]?.value || 0,
      })),
      trend,
      leadsBySource,
      recentLeads,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
