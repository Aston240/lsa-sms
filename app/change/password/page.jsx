'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ChangePasswordPage() {
  const router = useRouter();
  const [newPass, setNewPass] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('sms_token');
    if (!token) router.replace('/');
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (newPass.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (newPass !== confirm) { setError('Passwords do not match'); return; }

    setLoading(true);
    try {
      // Use reset-confirm flow with a special "first login" token stored server-side,
      // OR directly call a dedicated change-password endpoint.
      // Simplest: call PUT /api/users with self-update via token auth.
      const token = localStorage.getItem('sms_token');
      const user = JSON.parse(localStorage.getItem('sms_user') || '{}');
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ newPassword: newPass }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed'); return; }

      // Update local user to clear mustChangePassword
      localStorage.setItem('sms_user', JSON.stringify({ ...user, mustChangePassword: false }));
      router.replace('/sms');
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#0f1923', fontFamily: "'Segoe UI', sans-serif",
    }}>
      <div style={{
        background: '#1a2733', borderRadius: 12, padding: '48px 40px',
        width: '100%', maxWidth: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
        border: '1px solid #2a3a4a',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🔐</div>
          <h1 style={{ color: '#fff', fontSize: 20, fontWeight: 700, margin: 0 }}>Set Your Password</h1>
          <p style={{ color: '#8899aa', fontSize: 13, margin: '8px 0 0' }}>Please set a new password before continuing</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', color: '#aabbc0', fontSize: 12, fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>New Password</label>
            <input
              type="password"
              value={newPass}
              onChange={e => setNewPass(e.target.value)}
              required
              autoFocus
              style={{ width: '100%', padding: '10px 14px', borderRadius: 7, background: '#0f1923', border: '1px solid #2a3a4a', color: '#fff', fontSize: 15, outline: 'none', boxSizing: 'border-box' }}
              placeholder="Min. 8 characters"
            />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', color: '#aabbc0', fontSize: 12, fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Confirm Password</label>
            <input
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
              style={{ width: '100%', padding: '10px 14px', borderRadius: 7, background: '#0f1923', border: '1px solid #2a3a4a', color: '#fff', fontSize: 15, outline: 'none', boxSizing: 'border-box' }}
              placeholder="••••••••"
            />
          </div>
          {error && <div style={{ background: '#3a1a1a', border: '1px solid #c0392b', borderRadius: 7, padding: '10px 14px', color: '#e74c3c', fontSize: 13, marginBottom: 16 }}>{error}</div>}
          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', padding: '12px', borderRadius: 7, border: 'none', background: '#27ae60', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}
          >
            {loading ? 'Saving…' : 'Set Password & Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}
