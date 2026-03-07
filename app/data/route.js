import { NextResponse } from "next/server";
import { createClient } from "redis";

let client;
async function getClient() {
  if (!client) {
    client = createClient({ url: process.env.REDIS_URL || process.env.KV_URL });
    await client.connect();
  }
  return client;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");
    if (!key) return NextResponse.json({ error: "No key" }, { status: 400 });

    const redis = await getClient();
    const val = await redis.get(key);
    return NextResponse.json({ value: val ? JSON.parse(val) : null });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { key, value } = await request.json();
    if (!key) return NextResponse.json({ error: "No key" }, { status: 400 });

    const redis = await getClient();
    await redis.set(key, JSON.stringify(value));
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
