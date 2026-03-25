import { createClient } from 'redis';

const REDIS_URL = 'redis://default:cxNPTRSnRKZinIQXsYAMKa7t5AM1rHV4@redis-17938.crce204.eu-west-2-3.ec2.cloud.redislabs.com:17938';
const JWT_SECRET = 'lsa-sms-jwt-secret-2024';

async function sha256(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function makeJWT(payload) {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = btoa(JSON.stringify({ ...payload, iat: Date.now(), exp: Date.now() + 8 * 60 * 60 * 1000 }));
  // Simple HMAC-like signature using SHA-256 (no external deps)
  const sig = btoa(`${header}.${body}.${JWT_SECRET}`).replace(/=/g, '');
  return `${header}.${body}.${sig}`;
}

export async function POST(req) {
  const { email, password } = await req.json();
  if (!email || !password) return Response.json({ error: 'Missing fields' }, { status: 400 });

  const client = createClient({ url: REDIS_URL });
  await client.connect();

  try {
    const raw = await client.get('sms:users');
    const users = raw ? JSON.parse(raw) : [];
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!user) return Response.json({ error: 'Invalid email or password' }, { status: 401 });

    const hashed = await sha256(password);
    if (hashed !== user.passwordHash) return Response.json({ error: 'Invalid email or password' }, { status: 401 });

    // Write login audit entry
    const auditRaw = await client.get('sms:audit');
    const audit = auditRaw ? JSON.parse(auditRaw) : [];
    audit.push({
      id: `audit_${Date.now()}`,
      timestamp: new Date().toISOString(),
      user: user.name,
      email: user.email,
      action: 'LOGIN',
      tab: 'Auth',
      detail: 'User logged in',
      recordId: null,
    });
    await client.set('sms:audit', JSON.stringify(audit));

    const token = makeJWT({ id: user.id, name: user.name, email: user.email, role: user.role });
    return Response.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, mustChangePassword: user.mustChangePassword || false }
    });
  } finally {
    await client.disconnect();
  }
}
