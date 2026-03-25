import { createClient } from 'redis';

const REDIS_URL = 'redis://default:cxNPTRSnRKZinIQXsYAMKa7t5AM1rHV4@redis-17938.crce204.eu-west-2-3.ec2.cloud.redislabs.com:17938';

async function sha256(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function POST(req) {
  const { token, newPassword } = await req.json();
  if (!token || !newPassword) return Response.json({ error: 'Missing fields' }, { status: 400 });
  if (newPassword.length < 8) return Response.json({ error: 'Password must be at least 8 characters' }, { status: 400 });

  const client = createClient({ url: REDIS_URL });
  await client.connect();

  try {
    const tokensRaw = await client.get('sms:resetTokens');
    const tokens = tokensRaw ? JSON.parse(tokensRaw) : [];
    const entry = tokens.find(t => t.token === token);

    if (!entry) return Response.json({ error: 'Invalid or expired reset link' }, { status: 400 });
    if (Date.now() > entry.expires) return Response.json({ error: 'Reset link has expired — please request a new one' }, { status: 400 });

    // Update user password
    const usersRaw = await client.get('sms:users');
    const users = usersRaw ? JSON.parse(usersRaw) : [];
    const idx = users.findIndex(u => u.email === entry.email);
    if (idx === -1) return Response.json({ error: 'User not found' }, { status: 404 });

    users[idx].passwordHash = await sha256(newPassword);
    users[idx].mustChangePassword = false;
    await client.set('sms:users', JSON.stringify(users));

    // Remove used token
    const remaining = tokens.filter(t => t.token !== token);
    await client.set('sms:resetTokens', JSON.stringify(remaining));

    // Audit entry
    const auditRaw = await client.get('sms:audit');
    const audit = auditRaw ? JSON.parse(auditRaw) : [];
    audit.push({
      id: `audit_${Date.now()}`,
      timestamp: new Date().toISOString(),
      user: users[idx].name,
      email: users[idx].email,
      action: 'PASSWORD_RESET',
      tab: 'Auth',
      detail: 'Password reset via email link',
      recordId: null,
    });
    await client.set('sms:audit', JSON.stringify(audit));

    return Response.json({ ok: true });
  } finally {
    await client.disconnect();
  }
}
