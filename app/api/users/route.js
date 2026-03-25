import { createClient } from 'redis';

const REDIS_URL = 'redis://default:cxNPTRSnRKZinIQXsYAMKa7t5AM1rHV4@redis-17938.crce204.eu-west-2-3.ec2.cloud.redislabs.com:17938';

async function sha256(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function writeAudit(client, actor, action, detail, recordId = null) {
  const raw = await client.get('sms:audit');
  const audit = raw ? JSON.parse(raw) : [];
  audit.push({
    id: `audit_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
    timestamp: new Date().toISOString(),
    user: actor.name,
    email: actor.email,
    action,
    tab: 'Users',
    detail,
    recordId,
  });
  await client.set('sms:audit', JSON.stringify(audit));
}

// GET — list all users (admin only, passwords stripped)
export async function GET(req) {
  const actor = getActor(req);
  if (!actor || actor.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

  const client = createClient({ url: REDIS_URL });
  await client.connect();
  try {
    const raw = await client.get('sms:users');
    const users = raw ? JSON.parse(raw) : [];
    return Response.json(users.map(({ passwordHash, ...u }) => u));
  } finally {
    await client.disconnect();
  }
}

// POST — create user (admin only)
export async function POST(req) {
  const actor = getActor(req);
  if (!actor || actor.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

  const { name, email, role, tempPassword } = await req.json();
  if (!name || !email || !role || !tempPassword) return Response.json({ error: 'Missing fields' }, { status: 400 });

  const client = createClient({ url: REDIS_URL });
  await client.connect();
  try {
    const raw = await client.get('sms:users');
    const users = raw ? JSON.parse(raw) : [];

    if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
      return Response.json({ error: 'Email already in use' }, { status: 400 });
    }

    const newUser = {
      id: `user_${Date.now()}`,
      name,
      email,
      role, // 'admin' or 'member'
      passwordHash: await sha256(tempPassword),
      mustChangePassword: true,
      createdAt: new Date().toISOString(),
    };
    users.push(newUser);
    await client.set('sms:users', JSON.stringify(users));
    await writeAudit(client, actor, 'USER_CREATED', `Created user: ${name} (${email}) role: ${role}`, newUser.id);

    const { passwordHash, ...safe } = newUser;
    return Response.json(safe);
  } finally {
    await client.disconnect();
  }
}

// PUT — update user (admin only). Can update name, email, role. Admin can also reset password.
export async function PUT(req) {
  const actor = getActor(req);
  if (!actor || actor.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

  const { id, name, email, role, newPassword } = await req.json();
  if (!id) return Response.json({ error: 'Missing id' }, { status: 400 });

  const client = createClient({ url: REDIS_URL });
  await client.connect();
  try {
    const raw = await client.get('sms:users');
    const users = raw ? JSON.parse(raw) : [];
    const idx = users.findIndex(u => u.id === id);
    if (idx === -1) return Response.json({ error: 'User not found' }, { status: 404 });

    const changes = [];
    if (name && name !== users[idx].name) { changes.push(`name: ${users[idx].name} → ${name}`); users[idx].name = name; }
    if (email && email !== users[idx].email) { changes.push(`email: ${users[idx].email} → ${email}`); users[idx].email = email; }
    if (role && role !== users[idx].role) { changes.push(`role: ${users[idx].role} → ${role}`); users[idx].role = role; }
    if (newPassword) { users[idx].passwordHash = await sha256(newPassword); users[idx].mustChangePassword = true; changes.push('password reset by admin'); }

    await client.set('sms:users', JSON.stringify(users));
    await writeAudit(client, actor, 'USER_UPDATED', `Updated user ${users[idx].name}: ${changes.join(', ')}`, id);

    const { passwordHash, ...safe } = users[idx];
    return Response.json(safe);
  } finally {
    await client.disconnect();
  }
}

// DELETE — remove user (admin only, cannot delete self)
export async function DELETE(req) {
  const actor = getActor(req);
  if (!actor || actor.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await req.json();
  if (!id) return Response.json({ error: 'Missing id' }, { status: 400 });
  if (id === actor.id) return Response.json({ error: 'Cannot delete your own account' }, { status: 400 });

  const client = createClient({ url: REDIS_URL });
  await client.connect();
  try {
    const raw = await client.get('sms:users');
    const users = raw ? JSON.parse(raw) : [];
    const user = users.find(u => u.id === id);
    if (!user) return Response.json({ error: 'User not found' }, { status: 404 });

    await client.set('sms:users', JSON.stringify(users.filter(u => u.id !== id)));
    await writeAudit(client, actor, 'USER_DELETED', `Deleted user: ${user.name} (${user.email})`, id);

    return Response.json({ ok: true });
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
