import { createClient } from 'redis';

const REDIS_URL = 'redis://default:cxNPTRSnRKZinIQXsYAMKa7t5AM1rHV4@redis-17938.crce204.eu-west-2-3.ec2.cloud.redislabs.com:17938';

export async function GET(req) {
  const actor = getActor(req);
  if (!actor || actor.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

  const client = createClient({ url: REDIS_URL });
  await client.connect();
  try {
    const raw = await client.get('sms:audit');
    const audit = raw ? JSON.parse(raw) : [];
    // Newest first
    return Response.json([...audit].reverse());
  } finally {
    await client.disconnect();
  }
}

function getActor(req) {
  try {
    const auth = req.headers.get('authorization') || '';
    const token = auth.replace('Bearer ', '');
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    return JSON.parse(atob(parts[1]));
  } catch {
    return null;
  }
}
