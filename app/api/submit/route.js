import { createClient } from "redis";

const REDIS_URL = "redis://default:cxNPTRSnRKZinIQXsYAMKa7t5AM1rHV4@redis-17938.crce204.eu-west-2-3.ec2.cloud.redislabs.com:17938";

async function getClient() {
  const client = createClient({ url: REDIS_URL });
  await client.connect();
  return client;
}

export async function POST(req) {
  let redis;
  try {
    const body = await req.json();
    if (!body.title || !body.incidentDate || !body.what) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }
    redis = await getClient();
    const raw = await redis.get("sms:reports");
    const reports = raw ? JSON.parse(raw) : [];
    const nextId = reports.length > 0 ? Math.max(...reports.map(r => r.id || 0)) + 1 : 1;
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
    return Response.json({ error: "Server error", detail: err.message }, { status: 500 });
  } finally {
    if (redis) await redis.disconnect();
  }
}
