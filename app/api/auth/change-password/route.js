import { createClient } from 'redis';

const REDIS_URL = 'redis://default:cxNPTRSnRKZinIQXsYAMKa7t5AM1rHV4@redis-17938.crce204.eu-west-2-3.ec2.cloud.redislabs.com:17938';

async function sha256(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function getActor(req) {
  try {
    const auth = req.headers.get('authorization') || '';
    const token = auth.replace('Bearer ', '');
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function POST(req) {
  const actor = getActor(req);
  if (!actor) return Response.json({ error: 'Unauthorised' }, { status: 401 });

  const { newPassword } = await req.json();
  if (!newPassword || newPassword.length < 8) return Response.json({ error: 'Password must be at least 8 characters' }, { status: 400 });

  const client = createClient({ url: REDIS_URL });
  await client.connect();
  try {
    const raw = await client.get('sms:users');
    const users = raw ? JSON.parse(raw) : [];
    const idx = users.findIndex(u => u.id === actor.id);
    if (idx === -1) return Response.json({ error: 'User not found' }, { status: 404 });

    users[idx].passwordHash = await sha256(newPassword);
    users[idx].mustChangePassword = false;
    await client.set('sms:users', JSON.stringify(users));

    const auditRaw = await client.get('sms:audit');
    const audit = auditRaw ? JSON.parse(auditRaw) : [];
    audit.push({
      id: `audit_${Date.now()}`,
      timestamp: new Date().toISOString(),
      user: actor.name,
      email: actor.email,
      action: 'PASSWORD_CHANGED',
      tab: 'Auth',
      detail: 'User changed own password',
      recordId: null,
    });
    await client.set('sms:audit', JSON.stringify(audit));

    return Response.json({ ok: true });
  } finally {
    await client.disconnect();
  }
}
