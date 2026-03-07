import { createClient } from "redis";

const REDIS_URL = "redis://default:cxNPTRSnRKZinIQXsYAMKa7t5AM1rHV4@redis-17938.crce204.eu-west-2-3.ec2.cloud.redislabs.com:17938";

async function getClient() {
  const client = createClient({ url: REDIS_URL });
  await client.connect();
  return client;
}

export async function GET(req) {
  let redis;
  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key");
    if (!key) return Response.json({ error: "No key" }, { status: 400 });
    redis = await getClient();
    const raw = await redis.get(key);
    return Response.json({ value: raw ? JSON.parse(raw) : null });
  } catch (err) {
    return Response.json({ error: "Server error", detail: err.message }, { status: 500 });
  } finally {
    if (redis) await redis.disconnect();
  }
}

export async function POST(req) {
  let redis;
  try {
    const { key, value } = await req.json();
    if (!key) return Response.json({ error: "No key" }, { status: 400 });
    redis = await getClient();
    await redis.set(key, JSON.stringify(value));
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: "Server error", detail: err.message }, { status: 500 });
  } finally {
    if (redis) await redis.disconnect();
  }
}
