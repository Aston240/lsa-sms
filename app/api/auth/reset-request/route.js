import { createClient } from 'redis';

const REDIS_URL = 'redis://default:cxNPTRSnRKZinIQXsYAMKa7t5AM1rHV4@redis-17938.crce204.eu-west-2-3.ec2.cloud.redislabs.com:17938';
// Replace with your deployed GAS web app URL
const GAS_URL = 'https://script.google.com/macros/s/AKfycbwALEoxHEjo4_ME6w_-wB-mdvCPBhXz7lHlVcC5xlCDI0Vd0z08KKiGHUZxmPtsK6G3/exec';

function randomToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function POST(req) {
  const { email } = await req.json();
  if (!email) return Response.json({ ok: true }); // Never reveal if email exists

  const client = createClient({ url: REDIS_URL });
  await client.connect();

  try {
    const raw = await client.get('sms:users');
    const users = raw ? JSON.parse(raw) : [];
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!user) return Response.json({ ok: true }); // Silent — don't reveal

    const token = randomToken();
    const expires = Date.now() + 60 * 60 * 1000; // 1 hour

    const tokensRaw = await client.get('sms:resetTokens');
    const tokens = tokensRaw ? JSON.parse(tokensRaw) : [];
    // Remove any old tokens for this user
    const filtered = tokens.filter(t => t.email !== user.email);
    filtered.push({ token, email: user.email, expires });
    await client.set('sms:resetTokens', JSON.stringify(filtered));

    // Send reset email via GAS
    const resetLink = `https://lsa-sms.vercel.app/reset?token=${token}`;
    await fetch(GAS_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'passwordReset',
        to: user.email,
        name: user.name,
        resetLink,
      }),
    });

    return Response.json({ ok: true });
  } finally {
    await client.disconnect();
  }
}
