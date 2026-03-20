export async function POST(req) {
  try {
    const { reports, risks, actions } = await req.json();

    const prompt = `You are a General Aviation safety expert with 25 years of experience in aviation safety management, regulatory compliance, and risk assessment. You are presenting to a Safety Review Board for a GA flying school (LS Airmotive) based at Oxford Airport (EGTK).

Here is the complete SMS data for this organisation:

REPORTS (${reports.length} total):
${JSON.stringify(reports, null, 2)}

RISK REGISTER (${risks.length} entries):
${JSON.stringify(risks, null, 2)}

ACTION LOG (${actions.length} actions):
${JSON.stringify(actions, null, 2)}

Please provide a comprehensive Safety Review Board briefing. Structure your response as valid JSON with exactly this format and nothing else — no preamble, no markdown, just the raw JSON object:
{
  "executiveSummary": "2-3 paragraph executive summary of the overall safety picture",
  "keyMetrics": {
    "totalReports": number,
    "pendingReview": number,
    "openHighRisks": number,
    "overdueActions": number,
    "closedRisks": number
  },
  "trendAnalysis": "Analysis of patterns and trends in the data - what is recurring, what aircraft or operational areas are featuring most, any seasonal patterns",
  "topRisks": [
    { "id": "risk id", "title": "brief title", "concern": "why this needs board attention", "urgency": "HIGH or MEDIUM or LOW" }
  ],
  "overdueItems": [
    { "id": "action id", "description": "brief description", "owner": "owner name", "daysOverdue": number }
  ],
  "discussionPoints": [
    { "title": "Discussion point title", "detail": "Full detail for board discussion", "recommendation": "Specific recommended action" }
  ],
  "positives": ["List of positive safety indicators or improvements noted"],
  "conclusion": "Closing paragraph summarising the safety position and priority actions for the board to authorise"
}

Be direct, professional, and specific. Reference actual data points, specific hazard IDs, aircraft registrations, and dates where relevant. Do not be generic. Think like a CAA safety inspector who has seen what goes wrong at flying schools.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      "x-api-key": "process.env.ANTHROPIC_API_KEY",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 8000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return Response.json({ error: `Anthropic API error: ${response.status} — ${errText}` }, { status: 500 });
    }

    const data = await response.json();
    const text = data.content?.find(b => b.type === "text")?.text || "";
    const clean = text.replace(/```json|```/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch (parseErr) {
      return Response.json({ error: `JSON parse failed. Raw response: ${clean.slice(0, 500)}` }, { status: 500 });
    }

    return Response.json({ ok: true, analysis: parsed });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
