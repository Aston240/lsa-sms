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

Your job is to identify recurring themes across the reports and write a bulletin in plain, direct language. Be proportionate. Never identify individuals. Keep suggestions realistic for a small flying school.

Respond with ONLY valid JSON, no markdown, no backticks, no preamble. Be concise — keep all text fields brief:
{
  "themes": [
    {
      "title": "short theme title",
      "category": "e.g. Aircraft & Technical",
      "trendSummary": "2 sentences max describing the pattern. Plain English, no individual details.",
      "lessonLearned": "1 sentence — the key takeaway for pilots.",
      "actionsForPilots": "2-3 bullet points, each on a new line starting with · "
    }
  ],
  "whatWeActed": [
    {
      "change": "one short sentence describing what changed operationally"
    }
  ],
  "seriousFlag": false,
  "seriousFlagReason": ""
}

Return 1-3 themes maximum. Only include whatWeActed entries where a closed action clearly represents an operational change.`;

    // Sanitise and trim reports
    const sanitisedReports = reports.map(r => ({
      id: r.id,
      incidentDate: r.incidentDate,
      title: r.title,
      aircraft: r.aircraft || "—",
      operationalArea: r.operationalArea || "—",
      what: (r.what || "").slice(0, 200),
    }));

    // Only closed actions in period
    const closedActions = (actions || []).filter(a =>
      !a.deletedAt &&
      a.status === "Closed" &&
      a.closedDate &&
      a.closedDate >= dateFrom &&
      a.closedDate <= dateTo
    );

    const userMessage = `Draft a Flight Safety Bulletin for ${dateFrom} to ${dateTo} (Issue ${issueNumber}).

REPORTS (${sanitisedReports.length}):
${sanitisedReports.map(r => `[${r.incidentDate}] ${r.title} | ${r.aircraft} | ${r.operationalArea} | ${r.what}`).join("\n")}

CLOSED ACTIONS (${closedActions.length}):
${closedActions.map(a => `${a.id}: ${(a.description || "").slice(0, 100)}`).join("\n")}

Respond with valid JSON only. Keep all text fields short.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 6000,
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
