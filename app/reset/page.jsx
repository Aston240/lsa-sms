'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function ResetForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token');
  const [newPass, setNewPass] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) setError('Invalid reset link — no token found.');
  }, [token]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (newPass.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (newPass !== confirm) { setError('Passwords do not match'); return; }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: newPass }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Reset failed'); return; }
      setSuccess(true);
      setTimeout(() => router.replace('/'), 3000);
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
        {success ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
            <h1 style={{ color: '#fff', fontSize: 20, fontWeight: 700 }}>Password Updated</h1>
            <p style={{ color: '#8899aa', fontSize: 14 }}>Redirecting you to sign in…</p>
          </div>
        ) : (
          <>
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🔑</div>
              <h1 style={{ color: '#fff', fontSize: 20, fontWeight: 700, margin: 0 }}>Reset Password</h1>
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
                  disabled={!token}
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
                  disabled={!token}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 7, background: '#0f1923', border: '1px solid #2a3a4a', color: '#fff', fontSize: 15, outline: 'none', boxSizing: 'border-box' }}
                  placeholder="••••••••"
                />
              </div>
              {error && <div style={{ background: '#3a1a1a', border: '1px solid #c0392b', borderRadius: 7, padding: '10px 14px', color: '#e74c3c', fontSize: 13, marginBottom: 16 }}>{error}</div>}
              <button
                type="submit"
                disabled={loading || !token}
                style={{ width: '100%', padding: '12px', borderRadius: 7, border: 'none', background: '#2980b9', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}
              >
                {loading ? 'Saving…' : 'Reset Password'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export default function ResetPage() {
  return <Suspense><ResetForm /></Suspense>;
}
