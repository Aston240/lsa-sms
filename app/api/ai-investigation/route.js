// PATH: app/api/ai-investigation/route.js
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
    if (!ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: "ANTHROPIC_API_KEY not set" }, { status: 500 });
    }

    const { risk, linkedReports, linkedActions } = await req.json();

    if (!risk) {
      return NextResponse.json({ error: "No risk entry provided" }, { status: 400 });
    }

    const riskScore = (risk.initSeverity || 0) * (risk.initLikelihood || 0);
    const riskLevel = riskScore <= 4 ? "Low" : riskScore <= 9 ? "Medium" : riskScore <= 15 ? "High" : "Intolerable";
    const resScore = risk.residualSeverity && risk.residualLikelihood
      ? risk.residualSeverity * risk.residualLikelihood
      : null;
    const resLevel = resScore
      ? (resScore <= 4 ? "Low" : resScore <= 9 ? "Medium" : resScore <= 15 ? "High" : "Intolerable")
      : null;

    const systemPrompt = `You are an experienced aviation safety investigator and Head of Training at LS Airmotive, a UK GA flying school at Oxford Airport (EGTK), DTO.0258. You are writing an internal investigation report for submission to the CAA, for use in an AAIB response, or as Safety Review Board documentation.

Write a single flowing narrative investigation report. Do NOT use section headers, bullet points, numbered lists, or markdown. Write in clear, formal, plain English prose as a continuous document — the kind a competent Head of Training would be comfortable submitting to the CAA as part of an MOR response or to an AAIB inspector.

The narrative should naturally cover the following areas in flowing prose:
- A factual account of what occurred, referencing the aircraft, date, and operational context
- The nature of the hazard identified and its potential consequences
- The initial risk assessment findings
- Existing controls that were in place at the time
- The investigation process and findings
- Actions taken or planned, referencing specific action IDs and owners where relevant
- Current status of all associated actions
- The residual risk position following mitigation (if assessed)
- Any ongoing monitoring arrangements
- A concluding statement on proportionality and next steps

Be factual, precise, and proportionate. Reference actual data. Do not generalise. Do not invent facts. Do not include any information not provided to you. Write as a professional safety manager — not an academic. Keep the tone measured and objective. Total length: approximately 350–500 words.`;

    // Build the user message with all available data
    const reportSection = linkedReports && linkedReports.length > 0
      ? `SOURCE REPORT(S) (${linkedReports.length}):\n${linkedReports.map(r =>
          `Report #${r.id} — ${r.incidentDate || "date unknown"}\nTitle: ${r.title}\nAircraft: ${r.aircraft || "—"}\nLocation: ${r.location || "—"}\nPIC Type: ${r.picType || "—"}\nOperational Area: ${r.operationalArea || "—"}\nWhat happened: ${r.what || "—"}\nReporter: ${r.reporterDetails || "Anonymous"}`
        ).join("\n\n")}`
      : "SOURCE REPORT(S): None linked.";

    const actionSection = linkedActions && linkedActions.length > 0
      ? `ASSOCIATED ACTIONS (${linkedActions.length}):\n${linkedActions.map(a =>
          `${a.id}: ${a.description || "—"} | Owner: ${a.owner || "—"} | Priority: ${a.priority || "—"} | Status: ${a.status || "—"} | Target: ${a.targetDate || "—"} | Closed: ${a.closedDate || "—"} | Evidence: ${a.evidence || "—"}`
        ).join("\n")}`
      : "ASSOCIATED ACTIONS: None recorded.";

    const userMessage = `Draft an investigation report narrative for the following risk register entry.

RISK REGISTER ENTRY: ${risk.id}
Date Identified: ${risk.dateIdentified || "—"}
Aircraft: ${risk.aircraft || "—"}
Location: ${risk.location || "—"}
Operational Area: ${risk.operationalArea || "—"}
Hazard Category: ${risk.hazardCategory || "—"}
Hazard Description: ${risk.hazardDescription || "—"}
Potential Consequence: ${risk.potentialConsequence || "—"}
Initial Severity: ${risk.initSeverity || "—"} / Initial Likelihood: ${risk.initLikelihood || "—"} → Score: ${riskScore} (${riskLevel})
Existing Controls: ${risk.existingControls || "None recorded"}
Additional Mitigation Required: ${risk.additionalMitigation || "None recorded"}
Action Owner: ${risk.actionOwner || "—"}
Target Date: ${risk.targetDate || "—"}
Status: ${risk.status || "—"}
Date Implemented: ${risk.dateImplemented || "—"}
${resScore ? `Residual Severity: ${risk.residualSeverity} / Residual Likelihood: ${risk.residualLikelihood} → Residual Score: ${resScore} (${resLevel})` : "Residual Risk: Not yet assessed"}
Monitoring Method: ${risk.monitoringMethod || "Not specified"}

${reportSection}

${actionSection}

Write the investigation narrative now. Flowing prose only — no headers, no bullets, no markdown.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4000,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      let detail = errText;
      try { detail = JSON.parse(errText)?.error?.message || errText; } catch {}
      return NextResponse.json({ error: `Anthropic error ${response.status}: ${detail}` }, { status: 502 });
    }

    const data = await response.json();
    const narrative = data.content?.[0]?.text || "";

    return NextResponse.json({ ok: true, narrative });
  } catch (err) {
    console.error("ai-investigation error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
