import { createClient } from 'redis';

const REDIS_URL = 'redis://default:cxNPTRSnRKZinIQXsYAMKa7t5AM1rHV4@redis-17938.crce204.eu-west-2-3.ec2.cloud.redislabs.com:17938';

export async function POST(req) {
  try {
    const { userName, userEmail } = await req.json();

    const client = createClient({ url: REDIS_URL });
    await client.connect();

    try {
      const auditRaw = await client.get('sms:audit');
      const audit = auditRaw ? JSON.parse(auditRaw) : [];
      audit.push({
        id: `audit_${Date.now()}`,
        timestamp: new Date().toISOString(),
        user: userName || 'Unknown',
        email: userEmail || '',
        action: 'LOGOUT',
        tab: 'Auth',
        detail: 'User logged out',
        recordId: null,
      });
      await client.set('sms:audit', JSON.stringify(audit));
    } finally {
      await client.disconnect();
    }
  } catch (_) {
    // Logout always succeeds even if audit write fails
  }

  return Response.json({ ok: true });
}
