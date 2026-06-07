import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { WORKOUT_DAYS, getTotalSets } from '../lib/workoutData'

function BottomNav({ active, onSignOut }) {
  const navigate = useNavigate()
  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: '50%',
      transform: 'translateX(-50%)',
      width: '100%',
      maxWidth: '480px',
      background: '#111',
      borderTop: '1px solid #1e1e1e',
      display: 'flex',
      padding: '10px 0 22px',
      zIndex: 50,
    }}>
      {[
        { label: 'Workout', icon: '🏋️', path: '/dashboard' },
        { label: 'History', icon: '📊', path: '/history' },
      ].map((item) => (
        <button
          key={item.path}
          onClick={() => navigate(item.path)}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: active === item.path ? '#a855f7' : '#444',
          }}
        >
          <span style={{ fontSize: '22px' }}>{item.icon}</span>
          <span style={{ fontSize: '11px', fontWeight: active === item.path ? 600 : 400 }}>{item.label}</span>
        </button>
      ))}
      <button
        onClick={onSignOut}
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '4px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: '#444',
        }}
      >
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
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRecentSessions()
  }, [])

  const fetchRecentSessions = async () => {
    const { data } = await supabase
      .from('workout_sessions')
      .select('*, exercise_logs(id, completed)')
      .eq('user_id', session.user.id)
      .order('date', { ascending: false })
      .limit(12)
    setRecentSessions(data || [])
    setLoading(false)
  }

  const getSessionProgress = (s) => {
    const total = s.exercise_logs?.length || 0
    const done = s.exercise_logs?.filter((l) => l.completed).length || 0
    return total > 0 ? Math.round((done / total) * 100) : 0
  }

  const getLastSessionForDay = (dayNumber) =>
    recentSessions.find((s) => s.day_number === dayNumber)

  const username = session.user.email.split('@')[0]
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '90px' }}>
      <div style={{ padding: '28px 20px 0' }}>
        <p style={{ color: '#555', fontSize: '14px' }}>{greeting},</p>
        <h1 style={{ fontSize: '22px', fontWeight: 700, marginTop: '2px' }}>{username} 👋</h1>
        <p style={{ color: '#444', fontSize: '13px', marginTop: '4px' }}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </div>

      <div style={{ padding: '28px 16px 0' }}>
        <p style={{ fontSize: '11px', fontWeight: 700, color: '#444', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '16px', paddingLeft: '4px' }}>
          Weekly Routine
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {WORKOUT_DAYS.map((day) => {
            const lastSess = getLastSessionForDay(day.day)
            const progress = lastSess ? getSessionProgress(lastSess) : null
            const totalSets = getTotalSets(day)

            return (
              <button
                key={day.day}
                onClick={() => navigate(`/session/${day.day}`)}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '18px 18px 18px 22px',
                  background: '#161616',
                  border: '1px solid #222',
                  borderRadius: '16px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <div style={{
                  position: 'absolute',
                  left: 0, top: 0, bottom: 0,
                  width: '4px',
                  background: day.accent,
                }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: day.accent, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>
                      Day {day.day}
                    </div>
                    <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#f0f0f0', marginBottom: '3px' }}>{day.name}</h3>
                    <p style={{ fontSize: '13px', color: '#555' }}>{day.focus}</p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '12px' }}>
                    <div style={{ fontSize: '26px' }}>{day.icon}</div>
                    <div style={{ fontSize: '11px', color: '#3a3a3a', marginTop: '4px' }}>{day.exercises.length} exercises</div>
                  </div>
                </div>

                <div style={{ marginTop: '14px' }}>
                  {lastSess ? (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '7px' }}>
                        <span style={{ fontSize: '12px', color: '#444' }}>
                          Last: {new Date(lastSess.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                        <span style={{ fontSize: '12px', color: progress === 100 ? '#22c55e' : '#555' }}>
                          {progress === 100 ? '✓ Complete' : `${progress}%`}
                        </span>
                      </div>
                      <div style={{ height: '3px', background: '#1e1e1e', borderRadius: '2px' }}>
                        <div style={{
                          height: '100%',
                          width: `${progress}%`,
                          background: progress === 100 ? '#22c55e' : day.accent,
                          borderRadius: '2px',
                          transition: 'width 0.5s ease',
                        }} />
                      </div>
                    </>
                  ) : (
                    <div style={{ fontSize: '12px', color: '#333' }}>{totalSets} sets total · not started yet</div>
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
