import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { WORKOUT_DAYS, getTotalSets } from '../lib/workoutData'

function BottomNav({ active, onSignOut }) {
  const navigate = useNavigate()
  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
      width: '100%', maxWidth: '480px',
      background: 'rgba(7,7,11,0.9)', backdropFilter: 'blur(20px)',
      borderTop: '1px solid rgba(255,255,255,0.07)',
      display: 'flex', padding: '10px 0 24px', zIndex: 50,
    }}>
      {[
        { label: 'Workout', icon: '🏋️', path: '/dashboard' },
        { label: 'History', icon: '📊', path: '/history' },
      ].map((item) => (
        <button key={item.path} onClick={() => navigate(item.path)} style={{
          flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
          background: 'none', border: 'none', cursor: 'pointer',
          color: active === item.path ? '#a855f7' : '#444',
        }}>
          <span style={{ fontSize: '22px' }}>{item.icon}</span>
          <span style={{ fontSize: '11px', fontWeight: active === item.path ? 700 : 400 }}>{item.label}</span>
        </button>
      ))}
      <button onClick={onSignOut} style={{
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
        background: 'none', border: 'none', cursor: 'pointer', color: '#444',
      }}>
        <span style={{ fontSize: '22px' }}>👤</span>
        <span style={{ fontSize: '11px' }}>Sign Out</span>
      </button>
    </nav>
  )
}

export { BottomNav }

export default function Dashboard({ session }) {
  const navigate = useNavigate()
  const [recentSessions, setRecentSessions] = useState([])

  useEffect(() => {
    supabase.from('workout_sessions').select('*, exercise_logs(id, completed)')
      .eq('user_id', session.user.id).order('date', { ascending: false }).limit(12)
      .then(({ data }) => setRecentSessions(data || []))
  }, [])

  const getProgress = (s) => {
    const t = s.exercise_logs?.length || 0
    const d = s.exercise_logs?.filter(l => l.completed).length || 0
    return t > 0 ? Math.round((d / t) * 100) : 0
  }

  const lastFor = (day) => recentSessions.find(s => s.day_number === day)

  const username = session.user.email.split('@')[0]
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '90px' }}>
      <div style={{ padding: '36px 20px 0' }}>
        <p style={{ color: '#555', fontSize: '13px' }}>{greeting},</p>
        <h1 style={{ fontSize: '26px', fontWeight: 800, marginTop: '2px', letterSpacing: '-0.5px' }}>
          {username} <span style={{ fontSize: '22px' }}>👋</span>
        </h1>
        <p style={{ color: '#444', fontSize: '13px', marginTop: '4px' }}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </div>

      <div style={{ padding: '28px 16px 0' }}>
        <p style={{ fontSize: '11px', fontWeight: 700, color: '#444', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '14px', paddingLeft: '4px' }}>
          Weekly Routine
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {WORKOUT_DAYS.map((day) => {
            const last = lastFor(day.day)
            const prog = last ? getProgress(last) : null

            return (
              <button key={day.day} onClick={() => navigate(`/session/${day.day}`)} style={{
                display: 'block', width: '100%', padding: '18px 18px 18px 22px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '18px', cursor: 'pointer', textAlign: 'left',
                position: 'relative', overflow: 'hidden',
                backdropFilter: 'blur(16px)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                transition: 'transform 0.15s, box-shadow 0.15s',
              }}>
                <div style={{
                  position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px',
                  background: `linear-gradient(180deg, ${day.accent}, ${day.accent}88)`,
                }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: day.accent, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>
                      Day {day.day}
                    </div>
                    <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#f0f0f0', marginBottom: '3px', letterSpacing: '-0.3px' }}>{day.name}</h3>
                    <p style={{ fontSize: '13px', color: '#555' }}>{day.focus}</p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '12px' }}>
                    <div style={{
                      width: '48px', height: '48px', borderRadius: '14px',
                      background: `${day.accent}18`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px',
                    }}>{day.icon}</div>
                  </div>
                </div>

                <div style={{ marginTop: '14px' }}>
                  {last ? (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '7px' }}>
                        <span style={{ fontSize: '12px', color: '#444' }}>
                          Last: {new Date(last.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: prog === 100 ? '#22c55e' : '#555' }}>
                          {prog === 100 ? '✓ Complete' : `${prog}%`}
                        </span>
                      </div>
                      <div style={{ height: '3px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px' }}>
                        <div style={{
                          height: '100%', width: `${prog}%`,
                          background: prog === 100 ? '#22c55e' : `linear-gradient(90deg, ${day.accent}, ${day.accent}cc)`,
                          borderRadius: '2px', transition: 'width 0.5s ease',
                          boxShadow: prog === 100 ? '0 0 8px rgba(34,197,94,0.5)' : `0 0 8px ${day.accent}66`,
                        }} />
                      </div>
                    </>
                  ) : (
                    <div style={{ fontSize: '12px', color: '#333' }}>{getTotalSets(day)} sets · not started yet</div>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <BottomNav active="/dashboard" onSignOut={() => supabase.auth.signOut()} />
    </div>
  )
}
