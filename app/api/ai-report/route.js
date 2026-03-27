// PATH: app/api/ai-report/route.js
import { NextResponse } from "next/server";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

export async function POST(req) {
  try {
    const { report, allReports, risks, chatHistory } = await req.json();

    if (!report) {
      return NextResponse.json({ error: "No report provided" }, { status: 400 });
    }

    // Build the message history for the API
    // If chatHistory is provided, we're in follow-up discussion mode
    // Otherwise, we're doing the initial analysis
    let messages;

    const systemPrompt = `You are an experienced General Aviation Safety Management expert working for LS Airmotive, a flying school at Oxford Airport (EGTK). You help analyse safety reports and provide structured, actionable recommendations in line with CAA and EASA standards.

When analysing a report for the first time, you MUST respond with ONLY valid JSON in exactly this structure (no other text, no markdown):
{
  "category": "one of: Flight Operations – Airborne | Flight Operations – Ground | Aircraft & Technical | Training & Supervision | Human Factors | Organisational / Administrative",
  "suggestedSeverity": <integer 1-5>,
  "suggestedLikelihood": <integer 1-5>,
  "severityRationale": "<brief reason for severity rating>",
  "likelihoodRationale": "<brief reason for likelihood rating>",
  "similarReports": [<array of report IDs that are similar, empty if none>],
  "similarReportsSummary": "<brief explanation of why they are similar, or empty string>",
  "proposedRisk": {
    "hazardDescription": "<clear hazard statement>",
    "hazardCategory": "one of: Flight Operations – Airborne | Flight Operations – Ground | Aircraft & Technical | Training & Supervision | Human Factors | Organisational / Administrative",
    "potentialConsequence": "one of: Minor aircraft damage | Significant aircraft damage | Serious aircraft damage / hull loss | Serious injury | Fatal injury | Airspace infringement | Loss of separation | CFIT / terrain conflict | Loss of control in flight | Loss of communications | Regulatory non-compliance | Reputational damage",
    "existingControls": "<what controls already exist>",
    "additionalMitigation": "<what additional mitigation is recommended>"
  },
  "suggestedActions": [
    {
      "description": "<specific actionable task>",
      "owner": "one of: Tom Newell | Tam Abrahams | Joe Tomlin | Liam Salt | An Instructor",
      "priority": "HIGH | MEDIUM | LOW",
      "rationale": "<why this action is recommended>"
    }
  ],
  "summary": "<2-3 sentence plain English summary of the safety concern and key recommendation>"
}

When responding to follow-up questions (chat mode), respond in plain conversational English. You have full context of the report and the initial analysis. Be specific, reference actual details from the report, and be direct.`;

    if (!chatHistory || chatHistory.length === 0) {
      // Initial analysis request
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

EXISTING REPORTS FOR DUPLICATE/SIMILARITY CHECK (${activeReports.length} active reports):
${activeReports.slice(0, 30).map(r => `ID:${r.id} [${r.incidentDate}] ${r.title} — ${r.what?.slice(0, 120)}`).join("\n")}

CURRENT RISK REGISTER (${activeRisks.length} active risks):
${activeRisks.slice(0, 20).map(r => `${r.id}: ${r.hazardDescription?.slice(0, 100)} [${r.hazardCategory}]`).join("\n")}

Respond with JSON only.`;

      messages = [{ role: "user", content: userMessage }];
    } else {
      // Follow-up chat — reconstruct full conversation
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
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        system: systemPrompt,
        messages,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Anthropic API error:", err);
      return NextResponse.json({ error: "AI service error", detail: err }, { status: 502 });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || "";

    return NextResponse.json({ text });
  } catch (err) {
    console.error("ai-report route error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
