'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('sms_token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.exp > Date.now()) router.replace('/sms');
        else localStorage.removeItem('sms_token');
      } catch {
        localStorage.removeItem('sms_token');
      }
    }
  }, []);

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Login failed'); return; }

      localStorage.setItem('sms_token', data.token);
      localStorage.setItem('sms_user', JSON.stringify(data.user));

      if (data.user.mustChangePassword) {
        router.replace('/change-password');
      } else {
        router.replace('/sms');
      }
    } catch {
      setError('Network error — please try again');
    } finally {
      setLoading(false);
    }
  }

  async function handleResetRequest(e) {
    e.preventDefault();
    setResetLoading(true);
    await fetch('/api/auth/reset-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: resetEmail }),
    });
    setResetSent(true);
    setResetLoading(false);
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
        {/* Logo / header */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>✈️</div>
          <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 700, margin: 0 }}>LS Airmotive</h1>
          <p style={{ color: '#8899aa', fontSize: 13, margin: '6px 0 0' }}>Safety Management System</p>
        </div>

        {!showReset ? (
          <>
            <form onSubmit={handleLogin}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', color: '#aabbc0', fontSize: 12, fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoFocus
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: 7,
                    background: '#0f1923', border: '1px solid #2a3a4a', color: '#fff',
                    fontSize: 15, outline: 'none', boxSizing: 'border-box',
                  }}
                  placeholder="you@example.com"
                />
              </div>
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', color: '#aabbc0', fontSize: 12, fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: 7,
                    background: '#0f1923', border: '1px solid #2a3a4a', color: '#fff',
                    fontSize: 15, outline: 'none', boxSizing: 'border-box',
                  }}
                  placeholder="••••••••"
                />
              </div>
              {error && (
                <div style={{ background: '#3a1a1a', border: '1px solid #c0392b', borderRadius: 7, padding: '10px 14px', color: '#e74c3c', fontSize: 13, marginBottom: 16 }}>
                  {error}
                </div>
              )}
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%', padding: '12px', borderRadius: 7, border: 'none',
                  background: loading ? '#2a3a4a' : '#2980b9', color: '#fff',
                  fontSize: 15, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'background 0.2s',
                }}
              >
                {loading ? 'Signing in…' : 'Sign In'}
              </button>
            </form>
            <button
              onClick={() => { setShowReset(true); setResetEmail(email); setError(''); }}
              style={{ display: 'block', margin: '16px auto 0', background: 'none', border: 'none', color: '#5d8aa0', fontSize: 13, cursor: 'pointer', textDecoration: 'underline' }}
            >
              Forgot password?
            </button>
          </>
        ) : (
          <>
            {!resetSent ? (
              <form onSubmit={handleResetRequest}>
                <p style={{ color: '#aabbc0', fontSize: 14, marginBottom: 20, marginTop: 0 }}>
                  Enter your email and we'll send a reset link.
                </p>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', color: '#aabbc0', fontSize: 12, fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email</label>
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={e => setResetEmail(e.target.value)}
                    required
                    autoFocus
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: 7,
                      background: '#0f1923', border: '1px solid #2a3a4a', color: '#fff',
                      fontSize: 15, outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={resetLoading}
                  style={{
                    width: '100%', padding: '12px', borderRadius: 7, border: 'none',
                    background: '#2980b9', color: '#fff', fontSize: 15, fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {resetLoading ? 'Sending…' : 'Send Reset Link'}
                </button>
              </form>
            ) : (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📧</div>
                <p style={{ color: '#aabbc0', fontSize: 14 }}>
                  If that email is registered, a reset link is on its way. Check your inbox.
                </p>
              </div>
            )}
            <button
              onClick={() => { setShowReset(false); setResetSent(false); }}
              style={{ display: 'block', margin: '16px auto 0', background: 'none', border: 'none', color: '#5d8aa0', fontSize: 13, cursor: 'pointer', textDecoration: 'underline' }}
            >
              ← Back to sign in
            </button>
          </>
        )}
      </div>
    </div>
  );
}
