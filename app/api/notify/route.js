// PATH: app/api/notify/route.js

const REDIS_URL = "redis://default:cxNPTRSnRKZinIQXsYAMKa7t5AM1rHV4@redis-17938.crce204.eu-west-2-3.ec2.cloud.redislabs.com:17938";

import { createClient } from "redis";

async function getClient() {
  const client = createClient({ url: REDIS_URL });
  await client.connect();
  return client;
}

export async function GET(req) {
  let redis;
  try {
    const { searchParams } = new URL(req.url);
    const full = searchParams.get("full") === "true";

    redis = await getClient();

    if (full) {
      // Full data for Google Drive backup
      const [reportsRaw, risksRaw, actionsRaw, teamRaw] = await Promise.all([
        redis.get("sms:reports"),
        redis.get("sms:risks"),
        redis.get("sms:actions"),
        redis.get("sms:team"),
      ]);
      return Response.json({
        ok: true,
        reports: reportsRaw ? JSON.parse(reportsRaw) : [],
        risks: risksRaw ? JSON.parse(risksRaw) : [],
        actions: actionsRaw ? JSON.parse(actionsRaw) : [],
        team: teamRaw ? JSON.parse(teamRaw) : [],
      });
    } else {
      // Minimal data for email notifications
      const [actionsRaw, teamRaw] = await Promise.all([
        redis.get("sms:actions"),
        redis.get("sms:team"),
      ]);
      const actions = actionsRaw ? JSON.parse(actionsRaw) : [];
      const team = teamRaw ? JSON.parse(teamRaw) : [];
      const activeActions = actions.filter(a => !a.deletedAt && a.status !== "Closed");
      return Response.json({ ok: true, actions: activeActions, team });
    }
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  } finally {
    if (redis) await redis.disconnect();
  }
}
