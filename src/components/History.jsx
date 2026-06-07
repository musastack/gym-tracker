import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getDay } from '../lib/workoutData'
import { BottomNav } from './Dashboard'

export default function History({ session }) {
  const navigate = useNavigate()
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    fetchHistory()
  }, [])

  const fetchHistory = async () => {
    const { data } = await supabase
      .from('workout_sessions')
      .select('*, exercise_logs(*)')
      .eq('user_id', session.user.id)
      .order('date', { ascending: false })
      .limit(60)

    setSessions(data || [])
    setLoading(false)
  }

  const groupByExercise = (logs) => {
    const groups = {}
    if (!logs) return groups
    logs.forEach((log) => {
      if (!groups[log.exercise_name]) groups[log.exercise_name] = []
      groups[log.exercise_name].push(log)
    })
    Object.keys(groups).forEach((name) => {
      groups[name].sort((a, b) => a.set_number - b.set_number)
    })
    return groups
  }

  const getMaxWeight = (sess, exerciseName) => {
    const relevant = sess.exercise_logs?.filter(
      (l) => l.exercise_name === exerciseName && l.weight_kg != null && l.completed
    )
    if (!relevant || relevant.length === 0) return null
    return Math.max(...relevant.map((l) => l.weight_kg))
  }

  const getProgression = (currentSess, exerciseName) => {
    const prev = sessions.find(
      (s) => s.day_number === currentSess.day_number && s.date < currentSess.date
    )
    if (!prev) return null
    const curMax = getMaxWeight(currentSess, exerciseName)
    const prevMax = getMaxWeight(prev, exerciseName)
    if (curMax == null || prevMax == null) return null
    const diff = Math.round((curMax - prevMax) * 10) / 10
    if (diff > 0) return { type: 'up', diff }
    if (diff < 0) return { type: 'down', diff: Math.abs(diff) }
    return { type: 'same' }
  }

  const totalVolume = (sess) => {
    if (!sess.exercise_logs) return 0
    return sess.exercise_logs
      .filter((l) => l.completed && l.weight_kg != null && l.reps != null)
      .reduce((sum, l) => sum + l.weight_kg * l.reps, 0)
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div className="spinner" />
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '90px' }}>
      <div style={{ padding: '24px 16px 16px', borderBottom: '1px solid #1a1a1a' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => navigate('/dashboard')}
            style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '20px', lineHeight: 1 }}
          >
            ←
          </button>
          <h1 style={{ fontSize: '20px', fontWeight: 700 }}>History</h1>
          {sessions.length > 0 && (
            <span style={{ fontSize: '12px', color: '#333', marginLeft: 'auto' }}>{sessions.length} sessions</span>
          )}
        </div>
      </div>

      {sessions.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '55vh', color: '#333' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
          <p style={{ fontSize: '16px', color: '#555' }}>No workouts logged yet</p>
          <p style={{ fontSize: '13px', marginTop: '8px', color: '#333' }}>Start a session to see your history</p>
        </div>
      ) : (
        <div style={{ padding: '14px' }}>
          {sessions.map((sess) => {
            const day = getDay(sess.day_number)
            const exGroups = groupByExercise(sess.exercise_logs)
            const isOpen = expanded === sess.id
            const vol = totalVolume(sess)
            const completedCount = sess.exercise_logs?.filter((l) => l.completed).length || 0

            return (
              <div
                key={sess.id}
                style={{
                  background: '#161616',
                  border: '1px solid #222',
                  borderRadius: '14px',
                  marginBottom: '10px',
                  overflow: 'hidden',
                }}
              >
                <button
                  onClick={() => setExpanded(isOpen ? null : sess.id)}
                  style={{
                    width: '100%',
                    padding: '15px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    gap: '12px',
                  }}
                >
                  <div style={{
                    width: '4px',
                    alignSelf: 'stretch',
                    background: day?.accent || '#444',
                    borderRadius: '2px',
                    flexShrink: 0,
                    minHeight: '36px',
                  }} />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontSize: '15px', fontWeight: 600, color: '#eee' }}>
                          {day?.name || `Day ${sess.day_number}`}
                        </div>
                        <div style={{ fontSize: '12px', color: '#444', marginTop: '2px' }}>
                          {new Date(sess.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        {sess.completed && (
                          <div style={{ fontSize: '11px', color: '#22c55e', fontWeight: 700 }}>DONE</div>
                        )}
                        <div style={{ fontSize: '11px', color: '#333', marginTop: '2px' }}>
                          {completedCount} sets · {Math.round(vol).toLocaleString()}kg vol
                        </div>
                      </div>
                    </div>
                  </div>

                  <span style={{
                    color: '#333',
                    fontSize: '12px',
                    display: 'inline-block',
                    transform: isOpen ? 'rotate(180deg)' : 'none',
                    transition: 'transform 0.2s',
                    flexShrink: 0,
                  }}>▼</span>
                </button>

                {isOpen && (
                  <div style={{ padding: '0 16px 16px', borderTop: '1px solid #1e1e1e' }}>
                    {Object.keys(exGroups).length === 0 ? (
                      <p style={{ fontSize: '13px', color: '#333', marginTop: '14px' }}>No sets logged for this session.</p>
                    ) : (
                      Object.entries(exGroups).map(([exName, exLogs]) => {
                        const prog = getProgression(sess, exName)
                        return (
                          <div key={exName} style={{ marginTop: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                              <span style={{ fontSize: '13px', fontWeight: 600, color: '#ccc' }}>{exName}</span>
                              {prog && (
                                <span style={{
                                  fontSize: '12px',
                                  fontWeight: 700,
                                  color: prog.type === 'up' ? '#22c55e' : prog.type === 'down' ? '#f87171' : '#444',
                                }}>
                                  {prog.type === 'up' ? `↑ +${prog.diff}kg` : prog.type === 'down' ? `↓ -${prog.diff}kg` : '→ same'}
                                </span>
                              )}
                            </div>
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                              {exLogs.map((log) => (
                                <div
                                  key={log.id}
                                  style={{
                                    padding: '6px 10px',
                                    background: log.completed ? '#1e1e1e' : '#181818',
                                    borderRadius: '8px',
                                    fontSize: '13px',
                                    color: log.completed ? '#aaa' : '#444',
                                    border: '1px solid #272727',
                                  }}
                                >
                                  {log.weight_kg != null ? `${log.weight_kg}kg` : '—'} × {log.reps != null ? log.reps : '—'}
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <BottomNav active="/history" onSignOut={() => supabase.auth.signOut()} />
    </div>
  )
}
