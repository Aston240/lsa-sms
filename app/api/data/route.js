import { createClient } from "redis";

async function getClient() {
  const url = process.env.MY_REDIS_URL || process.env.REDIS_URL;
  const client = createClient({ url });
  await client.connect();
  return client;
}

export async function GET(req) {
  let redis;
  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key");
    if (!key) return Response.json({ error: "No key" }, { status: 400 });
    const url = process.env.MY_REDIS_URL || process.env.REDIS_URL;
    if (!url) return Response.json({ error: "REDIS_URL not set" }, { status: 500 });
    redis = await getClient();
    const raw = await redis.get(key);
    return Response.json({ value: raw ? JSON.parse(raw) : null });
  } catch (err) {
    return Response.json({ error: "Server error", detail: err.message, url_defined: !!url }, { status: 500 });
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
