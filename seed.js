import "dotenv/config";
import mongoose from "mongoose";
import connectDB from "./db.js";
import User from "./models/User.js";
import Lead from "./models/Lead.js";
import Contact from "./models/Contact.js";
import Note from "./models/Note.js";
import Task from "./models/Task.js";

const daysAgo = (n) => new Date(Date.now() - n * 86400_000);
const daysAhead = (n) => new Date(Date.now() + n * 86400_000);

async function seed() {
  await connectDB();

  // ── Wipe existing data ──────────────────────────────────────────────────
  await Promise.all([
    User.deleteMany({}),
    Lead.deleteMany({}),
    Contact.deleteMany({}),
    Note.deleteMany({}),
    Task.deleteMany({}),
  ]);
  console.log("🗑  Cleared existing data");

  // ── Create demo user ───────────────────────────────────────────────────
  const user = await User.create({
    name: "Alex Carter",
    email: "alex@timetoprogram.com",
    password: "password123",
    role: "owner",
    company: "Time To Program",
  });
  console.log(`👤 Created user: ${user.email}`);
  const uid = user._id;

  // ── Create leads ────────────────────────────────────────────────────────
  const leadDefs = [
    ["Dribbble Design", "Acme Corp", "New", "High", "Website", 89345, 8],
    ["Google Pay", "Globex", "Qualified", "High", "Referral", 124000, 20],
    ["Amazon Shopping", "Initech", "Proposal", "Medium", "Cold Outreach", 32123, 35],
    ["Stripe", "Umbrella Co", "Won", "High", "Event", 76500, 60],
    ["Notion", "Soylent", "New", "Low", "Social", 12400, 4],
    ["Figma", "Hooli", "Qualified", "Medium", "Website", 54000, 14],
    ["Linear", "Pied Piper", "Proposal", "High", "Referral", 98000, 28],
    ["Slack", "Vehement", "Lost", "Low", "Cold Outreach", 21000, 95],
    ["Vercel", "Massive Dynamic", "Won", "High", "Referral", 143000, 110],
    ["Airtable", "Wayne Ent.", "Qualified", "High", "Event", 67000, 18],
    ["Datadog", "Stark Industries", "New", "Medium", "Website", 45000, 2],
    ["Snowflake", "Cyberdyne", "Proposal", "High", "Referral", 152000, 48],
    ["HubSpot", "Tyrell Corp", "Won", "Medium", "Event", 88000, 150],
    ["Asana", "Aperture Labs", "Qualified", "Low", "Social", 30000, 22],
    ["Zoom", "Oscorp", "New", "Medium", "Cold Outreach", 26000, 6],
    ["GitLab", "LexCorp", "Lost", "Low", "Website", 18000, 70],
  ];

  const leads = await Lead.insertMany(
    leadDefs.map(([name, company, status, priority, source, value, ageDays]) => ({
      user: uid,
      name,
      company,
      email: `${name.toLowerCase().replace(/[^a-z]/g, "")}@${company.toLowerCase().replace(/[^a-z]/g, "")}.com`,
      phone: `+1 555 0${100 + leadDefs.indexOf(leadDefs.find((d) => d[0] === name))}`,
      status,
      priority,
      source,
      value,
      notes: status === "Won" ? "Closed — annual contract signed." : "Active opportunity in the pipeline.",
      tags: ["saas"],
      order: 0,
      createdAt: daysAgo(ageDays),
      updatedAt: daysAgo(Math.max(0, Math.floor(ageDays / 4))),
    }))
  );
  console.log(`📊 Created ${leads.length} leads`);

  const lById = (name) => leads.find((l) => l.name === name);
  const lRef = (name) => {
    const l = lById(name);
    return l ? { _id: l._id, name: l.name, company: l.company } : null;
  };

  // ── Create contacts ──────────────────────────────────────────────────────
  const contactDefs = [
    ["Olivia Bennett", "VP of Sales", "Acme Corp", ["decision-maker", "warm"], true],
    ["Noah Carter", "CTO", "Globex", ["technical", "champion"], true],
    ["Emma Walsh", "Procurement Manager", "Initech", ["finance"], false],
    ["Liam Foster", "Founder", "Umbrella Co", ["executive"], false],
    ["Ava Mitchell", "Head of Operations", "Hooli", ["warm"], false],
    ["Ethan Brooks", "Product Lead", "Pied Piper", ["champion", "technical"], true],
    ["Sophia Reed", "Marketing Director", "Wayne Ent.", ["influencer"], false],
    ["Mason Hayes", "CFO", "Cyberdyne", ["finance", "executive"], false],
    ["Isabella Diaz", "Head of Growth", "Stark Industries", ["vip", "warm"], false],
    ["Lucas Park", "Engineering Manager", "Tyrell Corp", ["technical"], false],
  ];

  const contacts = await Contact.insertMany(
    contactDefs.map(([name, title, company, tags, favorite]) => ({
      user: uid,
      name,
      title,
      company,
      email: `${name.split(" ")[0].toLowerCase()}@${company.toLowerCase().replace(/[^a-z]/g, "")}.com`,
      phone: `+1 555 0${100 + contactDefs.indexOf(contactDefs.find((d) => d[0] === name))}`,
      tags,
      favorite,
      notes: favorite ? "Primary point of contact." : "",
    }))
  );
  console.log(`👥 Created ${contacts.length} contacts`);

  // ── Create notes ─────────────────────────────────────────────────────────
  await Note.insertMany([
    { user: uid, content: "Decision expected end of month. Loop in a solutions engineer for the technical review.", lead: lRef("Google Pay"), pinned: true, createdAt: daysAgo(3) },
    { user: uid, content: "Pricing pushback on the Pro tier — prepare an ROI one-pager before the next call.", lead: lRef("Amazon Shopping"), pinned: false, createdAt: daysAgo(6) },
    { user: uid, content: "Champion is leaving the company; identify a backup stakeholder ASAP.", lead: lRef("Linear"), pinned: true, createdAt: daysAgo(9) },
    { user: uid, content: "Security questionnaire + SOC 2 report requested. Sent to the trust center.", lead: lRef("Snowflake"), pinned: false, createdAt: daysAgo(12) },
    { user: uid, content: "Great discovery call — strong interest in the analytics module.", lead: lRef("Dribbble Design"), pinned: false, createdAt: daysAgo(1) },
    { user: uid, content: "Expansion likely next quarter — multi-year deal already signed.", lead: lRef("Vercel"), pinned: false, createdAt: daysAgo(18) },
    { user: uid, content: "Scheduling a technical deep-dive with the engineering team.", lead: lRef("Airtable"), pinned: false, createdAt: daysAgo(5) },
    { user: uid, content: "Early stage, budget unconfirmed. Re-engage in two weeks.", lead: lRef("Notion"), pinned: false, createdAt: daysAgo(2) },
  ]);
  console.log("📝 Created 8 notes");

  // ── Create tasks ─────────────────────────────────────────────────────────
  await Task.insertMany([
    { user: uid, title: "Send proposal follow-up to Initech", priority: "High", status: "Pending", dueDate: daysAgo(2), relatedLead: lRef("Amazon Shopping") },
    { user: uid, title: "Schedule technical deep-dive with Wayne Ent.", priority: "Medium", status: "In Progress", dueDate: daysAhead(3), relatedLead: lRef("Airtable") },
    { user: uid, title: "Quarterly check-in with Massive Dynamic", priority: "Low", status: "Pending", dueDate: daysAhead(7), relatedLead: lRef("Vercel") },
    { user: uid, title: "Draft ROI one-pager for Initech", priority: "High", status: "Completed", dueDate: daysAgo(4), relatedLead: lRef("Amazon Shopping"), completedAt: daysAgo(3) },
    { user: uid, title: "Negotiate pricing with Cyberdyne", priority: "High", status: "Pending", dueDate: new Date(), relatedLead: lRef("Snowflake") },
    { user: uid, title: "Share case study with Globex", priority: "Medium", status: "Pending", dueDate: daysAhead(1), relatedLead: lRef("Google Pay") },
    { user: uid, title: "Confirm contract redlines with Pied Piper", priority: "High", status: "In Progress", dueDate: daysAgo(1), relatedLead: lRef("Linear") },
    { user: uid, title: "Book discovery call with Oscorp", priority: "Low", status: "Pending", dueDate: daysAhead(5), relatedLead: lRef("Zoom") },
    { user: uid, title: "Send security docs to Cyberdyne", priority: "Medium", status: "Completed", dueDate: daysAgo(8), relatedLead: lRef("Snowflake"), completedAt: daysAgo(7) },
    { user: uid, title: "Re-engage stalled deal at Soylent", priority: "Low", status: "Pending", dueDate: daysAhead(14), relatedLead: lRef("Notion") },
  ]);
  console.log("✅ Created 10 tasks");

  console.log("\n🎉 Database seeded successfully!");
  console.log("📧 Login:    alex@timetoprogram.com");
  console.log("🔑 Password: password123");
  mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
