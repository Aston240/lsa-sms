import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const body = await request.json();

    const secret = process.env.WEBHOOK_SECRET;
    if (secret && body.secret !== secret) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
