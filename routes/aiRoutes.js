import express from "express";
import protect from "../middleware/auth.js";
import Lead from "../models/Lead.js";

const router = express.Router();
router.use(protect);

// ─── Helper: build Gemini client lazily ────────────────────────────────────
let _ai = null;
const getAI = async () => {
  if (_ai) return _ai;
  if (!process.env.GEMINI_API_KEY) return null;
  const { GoogleGenAI } = await import("@google/genai");
  _ai = new GoogleGenAI(process.env.GEMINI_API_KEY);
  return _ai;
};

const MODEL = "gemini-2.5-flash";

const askGemini = async (prompt) => {
  const ai = await getAI();
  if (!ai) return null;
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
  });
  return response.text;
};

// ─── GET /api/ai/status ────────────────────────────────────────────────────
router.get("/status", async (_req, res) => {
  const configured = !!process.env.GEMINI_API_KEY;
  res.json({
    success: true,
    configured,
    model: configured ? `${MODEL} (live)` : `${MODEL} (mock — no key)`,
  });
});

// ─── POST /api/ai/lead-summary ─────────────────────────────────────────────
router.post("/lead-summary", async (req, res, next) => {
  try {
    const { leadId } = req.body;
    const lead = await Lead.findOne({ _id: leadId, user: req.user._id });
    if (!lead) return res.status(404).json({ success: false, message: "Lead not found" });

    const prompt = `You are an expert sales analyst. Analyze this CRM lead and respond ONLY with a valid JSON object (no markdown, no code fences).

Lead data:
- Name: ${lead.name}
- Company: ${lead.company}
- Status: ${lead.status}
- Priority: ${lead.priority}
- Source: ${lead.source}
- Deal Value: $${lead.value.toLocaleString()}
- Notes: ${lead.notes || "None"}
- Tags: ${lead.tags.join(", ") || "None"}
- Created: ${new Date(lead.createdAt).toDateString()}

Return exactly this JSON shape:
{
  "summary": "2-3 sentence opportunity summary",
  "riskScore": <integer 0-100>,
  "suggestedPriority": "High" | "Medium" | "Low",
  "nextBestAction": "one clear next action sentence"
}`;

    const raw = await askGemini(prompt);

    if (!raw) {
      // Fallback mock when no API key
      return res.json({
        success: true,
        summary: `${lead.name} at ${lead.company} is a ${lead.status.toLowerCase()} opportunity with a deal value of $${lead.value.toLocaleString()}. The account shows ${lead.priority.toLowerCase()} priority signals.`,
        riskScore: lead.status === "Lost" ? 85 : lead.status === "Won" ? 10 : 40,
        suggestedPriority: lead.priority,
        nextBestAction: `Follow up with ${lead.company} to advance this deal to the next stage.`,
      });
    }

    const cleaned = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    // Persist AI summary back to the lead
    lead.aiSummary = parsed.summary;
    lead.aiRiskScore = parsed.riskScore;
    await lead.save();

    res.json({ success: true, ...parsed });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/ai/generate-email ───────────────────────────────────────────
router.post("/generate-email", async (req, res, next) => {
  try {
    const { leadId, tone = "professional", goal: goalInput, purpose } = req.body;
    const goal = goalInput || purpose || "follow-up";
    const lead = await Lead.findOne({ _id: leadId, user: req.user._id });
    if (!lead) return res.status(404).json({ success: false, message: "Lead not found" });

    const senderName = req.user.name;
    const senderCompany = req.user.company || "our company";

    const prompt = `You are an expert B2B sales copywriter. Write a ${tone} ${goal} email for the following lead.

Lead details:
- Name: ${lead.name}
- Company: ${lead.company}
- Stage: ${lead.status}
- Deal Value: $${lead.value.toLocaleString()}
- Notes: ${lead.notes || "None"}

Sender: ${senderName} from ${senderCompany}

Respond ONLY with a valid JSON object (no markdown):
{
  "subject": "email subject line",
  "body": "full email body with proper greeting and signature"
}`;

    const raw = await askGemini(prompt);

    if (!raw) {
      return res.json({
        success: true,
        subject: `Following up on our conversation – ${lead.company}`,
        body: `Hi ${lead.name},\n\nI wanted to follow up on our recent conversation and see how we can help ${lead.company} achieve its goals this quarter.\n\nWould you be open to a quick 20-minute call this week?\n\nBest,\n${senderName}\n${senderCompany}`,
      });
    }

    const cleaned = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    res.json({ success: true, ...parsed });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/ai/sales-insights ───────────────────────────────────────────
router.post("/sales-insights", async (req, res, next) => {
  try {
    // Gather real pipeline data for context
    const leads = await Lead.find({ user: req.user._id });
    const stageCount = {};
    let totalValue = 0;
    let wonValue = 0;
    for (const l of leads) {
      stageCount[l.status] = (stageCount[l.status] || 0) + 1;
      totalValue += l.value || 0;
      if (l.status === "Won") wonValue += l.value || 0;
    }
    const won = stageCount.Won || 0;
    const lost = stageCount.Lost || 0;
    const convRate = won + lost > 0 ? Math.round((won / (won + lost)) * 100) : 0;
    const stalledProposals = leads.filter(
      (l) =>
        l.status === "Proposal" &&
        new Date() - new Date(l.updatedAt) > 21 * 86400000
    ).length;

    const prompt = `You are an expert sales coach. Analyze this sales pipeline and provide strategic insights.

Pipeline summary:
- Total leads: ${leads.length}
- By stage: ${JSON.stringify(stageCount)}
- Total pipeline value: $${totalValue.toLocaleString()}
- Won revenue: $${wonValue.toLocaleString()}
- Win rate: ${convRate}%
- Stalled proposals (>21 days): ${stalledProposals}

Respond ONLY with valid JSON (no markdown):
{
  "headline": "one punchy insight headline",
  "insights": ["insight 1", "insight 2", "insight 3"],
  "recommendations": ["action 1", "action 2", "action 3"],
  "healthScore": <integer 0-100>
}`;

    const raw = await askGemini(prompt);

    if (!raw) {
      return res.json({
        success: true,
        headline: `Pipeline has ${leads.length} active leads with a ${convRate}% win rate.`,
        insights: [
          `Current win rate is ${convRate}%.`,
          `Pipeline contains $${totalValue.toLocaleString()} in potential revenue.`,
          stalledProposals > 0
            ? `${stalledProposals} proposal(s) have stalled for over 21 days.`
            : "No stalled proposals — pipeline velocity is healthy.",
        ],
        recommendations: [
          "Review the oldest open leads and qualify or disqualify them.",
          stalledProposals > 0
            ? "Reach out to stalled proposals with updated ROI materials."
            : "Continue current cadence — pipeline is moving well.",
          "Double down on your highest-converting lead source.",
        ],
        healthScore: Math.min(100, Math.max(20, convRate + 30)),
      });
    }

    const cleaned = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    res.json({ success: true, ...parsed });
  } catch (err) {
    next(err);
  }
});

export default router;
