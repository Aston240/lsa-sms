// PATH: app/api/ai-report/route.js
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    // Read the key inside the function, not at module level
    const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

    if (!ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: "ANTHROPIC_API_KEY environment variable is not set" }, { status: 500 });
    }

    const { report, allReports, risks, chatHistory } = await req.json();

    if (!report && (!chatHistory || chatHistory.length === 0)) {
      return NextResponse.json({ error: "No report provided" }, { status: 400 });
    }

    let messages;

    const systemPrompt = `You are an experienced General Aviation Safety Management expert working for LS Airmotive, a flying school at Oxford Airport (EGTK). You help analyse safety reports and provide structured, actionable recommendations in line with CAA and EASA standards.

When analysing a report for the first time, you MUST respond with ONLY valid JSON in exactly this structure (no other text, no markdown backticks):
{
  "category": "one of: Flight Operations – Airborne | Flight Operations – Ground | Aircraft & Technical | Training & Supervision | Human Factors | Organisational / Administrative",
  "suggestedSeverity": 1,
  "suggestedLikelihood": 1,
  "severityRationale": "brief reason for severity rating",
  "likelihoodRationale": "brief reason for likelihood rating",
  "similarReports": [],
  "similarReportsSummary": "",
  "proposedRisk": {
    "hazardDescription": "clear hazard statement",
    "hazardCategory": "one of: Flight Operations – Airborne | Flight Operations – Ground | Aircraft & Technical | Training & Supervision | Human Factors | Organisational / Administrative",
    "potentialConsequence": "one of: Minor aircraft damage | Significant aircraft damage | Serious aircraft damage / hull loss | Serious injury | Fatal injury | Airspace infringement | Loss of separation | CFIT / terrain conflict | Loss of control in flight | Loss of communications | Regulatory non-compliance | Reputational damage",
    "existingControls": "what controls already exist",
    "additionalMitigation": "what additional mitigation is recommended"
  },
  "suggestedActions": [
    {
      "description": "specific actionable task",
      "owner": "one of: Tom Newell | Tam Abrahams | Joe Tomlin | Liam Salt | An Instructor",
      "priority": "HIGH or MEDIUM or LOW",
      "rationale": "why this action is recommended"
    }
  ],
  "summary": "2-3 sentence plain English summary of the safety concern and key recommendation"
}

When responding to follow-up questions (chat mode), respond in plain conversational English. Be specific, reference actual details from the report, and be direct.`;

    if (!chatHistory || chatHistory.length === 0) {
      const activeReports = (allReports || []).filter(r => !r.deletedAt && r.id !== report.id);
      const activeRisks = (risks || []).filter(r => !r.deletedAt);

      const userMessage = `Please analyse this safety report:

REPORT TO ANALYSE:
ID: ${report.id}
Date: ${report.incidentDate}
Title: ${report.title}
Aircraft: ${report.aircraft || "Not specified"}
Location: ${report.location || "Not specified"}
PIC Type: ${report.picType || "Not specified"}
Operational Area: ${report.operationalArea || "Not specified"}
What happened: ${report.what}
Reporter: ${report.reporterDetails || "Anonymous"}

EXISTING REPORTS FOR SIMILARITY CHECK (${activeReports.length} active reports):
${activeReports.slice(0, 30).map(r => `ID:${r.id} [${r.incidentDate}] ${r.title} — ${(r.what || "").slice(0, 120)}`).join("\n")}

CURRENT RISK REGISTER (${activeRisks.length} active risks):
${activeRisks.slice(0, 20).map(r => `${r.id}: ${(r.hazardDescription || "").slice(0, 100)} [${r.hazardCategory || ""}]`).join("\n")}

Respond with valid JSON only. No markdown, no backticks, no preamble.`;

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
