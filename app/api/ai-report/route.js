// PATH: app/api/ai-report/route.js
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

    if (!ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: "ANTHROPIC_API_KEY environment variable is not set" }, { status: 500 });
    }

    const { report, allReports, risks, chatHistory } = await req.json();

    if (!report && (!chatHistory || chatHistory.length === 0)) {
      return NextResponse.json({ error: "No report provided" }, { status: 400 });
    }

    let messages;

    const systemPrompt = `You are an experienced GA flying instructor and safety officer at a small UK flying school (LS Airmotive, based at Oxford Airport EGTK). You have 30 years of general aviation experience. You review safety reports with common sense and proportion — most incidents at a flying school involve student handling errors, carb ice, minor snags, ATC misunderstandings, or procedural lapses. You know the difference between something that needs urgent action and something that needs a note and a watchful eye.

Your job is to help the Chief Flying Instructor quickly assess a report and decide what, if anything, needs doing. Keep your language plain and direct — no corporate jargon, no over-engineering. Suggest actions that are realistic for a small flying school with limited budget and no full-time maintenance staff.

When analysing a report for the first time, respond with ONLY valid JSON in exactly this structure (no markdown, no backticks, no preamble):
{
  "category": "one of: Flight Operations – Airborne | Flight Operations – Ground | Aircraft & Technical | Training & Supervision | Human Factors | Organisational / Administrative",
  "suggestedSeverity": 1,
  "suggestedLikelihood": 1,
  "summary": "2-3 plain sentences summarising what happened and what, if anything, needs attention. Write as you would to a colleague — direct and proportionate.",
  "similarReports": [],
  "similarReportsSummary": "",
  "proposedRisk": {
    "hazardDescription": "clear plain-English hazard statement",
    "hazardCategory": "one of: Flight Operations – Airborne | Flight Operations – Ground | Aircraft & Technical | Training & Supervision | Human Factors | Organisational / Administrative",
    "potentialConsequence": "one of: Minor aircraft damage | Significant aircraft damage | Serious aircraft damage / hull loss | Serious injury | Fatal injury | Airspace infringement | Loss of separation | CFIT / terrain conflict | Loss of control in flight | Loss of communications | Regulatory non-compliance | Reputational damage",
    "existingControls": "what is already in place",
    "additionalMitigation": "only suggest mitigation that is realistic and proportionate for a small flying school"
  },
  "suggestedActions": [
    {
      "description": "specific, realistic action — nothing that would require specialist equipment or large budget unless the severity genuinely warrants it",
      "owner": "one of: Tom Newell | Tam Abrahams | Joe Tomlin | Liam Salt | An Instructor",
      "priority": "HIGH or MEDIUM or LOW",
      "rationale": "brief plain-English reason"
    }
  ]
}

When responding to follow-up questions, be conversational and direct. Think out loud like a CFI talking to a colleague, not a consultant writing a report.`;

    if (!chatHistory || chatHistory.length === 0) {
      const activeReports = (allReports || []).filter(r => !r.deletedAt && r.id !== report.id);
      const activeRisks = (risks || []).filter(r => !r.deletedAt);

      const userMessage = `Please analyse this safety report:

REPORT:
ID: ${report.id}
Date: ${report.incidentDate}
Title: ${report.title}
Aircraft: ${report.aircraft || "Not specified"}
Location: ${report.location || "Not specified"}
PIC Type: ${report.picType || "Not specified"}
Operational Area: ${report.operationalArea || "Not specified"}
What happened: ${report.what}
Reporter: ${report.reporterDetails || "Anonymous"}

EXISTING REPORTS FOR SIMILARITY CHECK (${activeReports.length} reports):
${activeReports.slice(0, 30).map(r => `ID:${r.id} [${r.incidentDate}] ${r.title} — ${(r.what || "").slice(0, 120)}`).join("\n")}

CURRENT RISK REGISTER (${activeRisks.length} risks):
${activeRisks.slice(0, 20).map(r => `${r.id}: ${(r.hazardDescription || "").slice(0, 100)} [${r.hazardCategory || ""}]`).join("\n")}

Respond with valid JSON only.`;

      messages = [{ role: "user", content: userMessage }];
    } else {
      messages = chatHistory;
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2000,
        system: systemPrompt,
        messages,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Anthropic API error:", response.status, errText);
      let detail = errText;
      try { detail = JSON.parse(errText)?.error?.message || errText; } catch {}
      return NextResponse.json({ error: `Anthropic error ${response.status}: ${detail}` }, { status: 502 });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || "";

    return NextResponse.json({ text });
  } catch (err) {
    console.error("ai-report route error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
