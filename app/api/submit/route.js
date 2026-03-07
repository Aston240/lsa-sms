import { createClient } from "redis";

let client;
async function getClient() {
  if (!client) {
    client = createClient({ url: process.env.REDIS_URL });
    await client.connect();
  }
  return client;
}

export async function POST(req) {
  try {
    const body = await req.json();

    // Basic validation
    if (!body.title || !body.incidentDate || !body.what) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    const redis = await getClient();

    // Load existing reports
    const raw = await redis.get("sms:reports");
    const reports = raw ? JSON.parse(raw) : [];

    // Generate next ID
    const nextId = reports.length > 0 ? Math.max(...reports.map(r => r.id || 0)) + 1 : 1;

    // Build new report
    const newReport = {
      id: nextId,
      submittedAt: body.submittedAt || new Date().toISOString(),
      incidentDate: body.incidentDate,
      title: body.title,
      location: body.location || "",
      aircraft: body.aircraft || "",
      picType: body.picType || "",
      operationalArea: body.operationalArea || "",
      what: body.what,
      reporterDetails: body.reporterDetails || "",
      source: "manual",
      acknowledged: false,
    };

    reports.push(newReport);
    await redis.set("sms:reports", JSON.stringify(reports));

    return Response.json({ ok: true, id: nextId });
  } catch (err) {
    console.error("Submit error:", err);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
