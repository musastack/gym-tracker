import { useState } from 'react'
import { supabase } from '../lib/supabase'

const USERNAME_MAP = {
  mo: 'mo@gymtracker.app',
}

export default function Auth() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const email = USERNAME_MAP[username.trim().toLowerCase()]
    if (!email) { setError('Unknown username.'); setLoading(false); return }
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError('Invalid username or password.')
    setLoading(false)
  }

  const inputStyle = {
    width: '100%',
    padding: '14px 16px',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '12px',
    color: '#f0f0f0',
    fontSize: '15px',
    outline: 'none',
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '360px' }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <div style={{
            width: '80px', height: '80px', borderRadius: '24px',
            background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '36px', margin: '0 auto 20px',
            boxShadow: '0 0 40px rgba(168,85,247,0.4)',
          }}>💪</div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, letterSpacing: '-0.5px' }}>Gym Tracker</h1>
          <p style={{ color: '#555', marginTop: '8px', fontSize: '14px' }}>Track your gains, crush your goals</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#555', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Username</label>
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Mo" required autoCapitalize="none" style={inputStyle} />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#555', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required style={inputStyle} />
          </div>

          {error && (
            <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', color: '#f87171', fontSize: '14px', marginBottom: '16px' }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} style={{
            width: '100%', padding: '16px',
            background: loading ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg, #7c3aed, #a855f7)',
            color: loading ? '#444' : '#fff',
            border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer',
            boxShadow: loading ? 'none' : '0 0 30px rgba(168,85,247,0.35)',
            transition: 'all 0.2s',
          }}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
