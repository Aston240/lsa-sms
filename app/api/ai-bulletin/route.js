// PATH: app/api/ai-bulletin/route.js
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
    if (!ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: "ANTHROPIC_API_KEY not set" }, { status: 500 });
    }

    const { reports, actions, dateFrom, dateTo, issueNumber } = await req.json();

    if (!reports || !reports.length) {
      return NextResponse.json({ error: "No reports provided" }, { status: 400 });
    }

    const systemPrompt = `You are an experienced GA flying instructor and Head of Training at LS Airmotive, a small UK flying school at Oxford Airport (EGTK). You are writing a monthly Flight Safety Bulletin for students, instructors and staff.

Your job is to:
1. Identify recurring themes or patterns across the reports — not individual incidents
2. Write in plain, direct language a student pilot would understand — no jargon, no corporate tone
3. Be proportionate — a carb ice event that resolved fine is a learning point, not a crisis
4. Never identify individuals — write as if briefing the whole school
5. Keep suggestions realistic for a small flying school

You must respond with ONLY valid JSON, no markdown, no backticks, no preamble:
{
  "themes": [
    {
      "title": "short theme title e.g. Carburettor icing on climb-out",
      "category": "e.g. Aircraft & Technical",
      "trendSummary": "2-3 sentences describing the pattern observed across reports. Plain English, no individual details.",
      "lessonLearned": "1-2 sentences — the key takeaway for pilots.",
      "actionsForPilots": "2-4 bullet points as a single string, each point on a new line starting with · "
    }
  ],
  "whatWeActed": [
    {
      "change": "one sentence describing what changed operationally as a result of reports"
    }
  ],
  "seriousFlag": true or false,
  "seriousFlagReason": "if seriousFlag is true, brief reason why one report warrants its own dedicated section"
}

Identify 1-3 themes maximum. If there is genuinely only one theme, return one. Do not invent themes to pad the bulletin.
For whatWeActed, only include items where a closed action clearly represents an operational change — not admin tasks.`;

    // Sanitise reports — remove reporter details and names before sending to AI
    const sanitisedReports = reports.map(r => ({
      id: r.id,
      incidentDate: r.incidentDate,
      title: r.title,
      aircraft: r.aircraft,
      location: r.location,
      picType: r.picType,
      operationalArea: r.operationalArea,
      what: r.what,
    }));

    // Only include closed actions in the period for "what we acted" section
    const closedActions = (actions || []).filter(a =>
      !a.deletedAt &&
      a.status === "Closed" &&
      a.closedDate &&
      a.closedDate >= dateFrom &&
      a.closedDate <= dateTo
    );

    const userMessage = `Please draft a Flight Safety Bulletin for the period ${dateFrom} to ${dateTo} (Issue ${issueNumber}).

REPORTS IN THIS PERIOD (${sanitisedReports.length} reports):
${sanitisedReports.map(r => `[${r.incidentDate}] ${r.title} | Aircraft: ${r.aircraft || "—"} | Area: ${r.operationalArea || "—"} | PIC: ${r.picType || "—"}
What happened: ${(r.what || "").slice(0, 300)}`).join("\n\n")}

ACTIONS CLOSED IN THIS PERIOD (${closedActions.length} actions):
${closedActions.map(a => `${a.id}: ${a.description} | Closed: ${a.closedDate} | Evidence: ${a.evidence || "none recorded"}`).join("\n")}

Respond with valid JSON only.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
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
    const text = data.content?.[0]?.text || "";
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    return NextResponse.json({ ok: true, bulletin: parsed });
  } catch (err) {
    console.error("ai-bulletin error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
