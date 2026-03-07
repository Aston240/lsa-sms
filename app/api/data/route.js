import { createClient } from "redis";

let client;
async function getClient() {
  if (!client) {
    client = createClient({ url: process.env.REDIS_URL });
    await client.connect();
  }
  return client;
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key");
    if (!key) return Response.json({ error: "No key" }, { status: 400 });
    const redis = await getClient();
    const raw = await redis.get(key);
    return Response.json({ value: raw ? JSON.parse(raw) : null });
  } catch (err) {
    console.error("GET error:", err);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { key, value } = await req.json();
    if (!key) return Response.json({ error: "No key" }, { status: 400 });
    const redis = await getClient();
    await redis.set(key, JSON.stringify(value));
    return Response.json({ ok: true });
  } catch (err) {
    console.error("POST error:", err);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
