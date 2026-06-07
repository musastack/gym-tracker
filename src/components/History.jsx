import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useRoutine } from '../lib/routineContext'
import { BottomNav } from './Dashboard'

const glass = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  backdropFilter: 'blur(16px)',
}

export default function History({ session }) {
  const navigate = useNavigate()
  const { getDay } = useRoutine()
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)
  const [compareMode, setCompareMode] = useState({}) // sessionId -> bool

  useEffect(() => { fetchHistory() }, [])

  const fetchHistory = async () => {
    const { data } = await supabase.from('workout_sessions').select('*, exercise_logs(*)')
      .eq('user_id', session.user.id).order('date', { ascending: false }).limit(100)
    setSessions(data || [])
    setLoading(false)
  }

  const groupByExercise = (logs) => {
    if (!logs) return {}
    const g = {}
    logs.forEach(l => { if (!g[l.exercise_name]) g[l.exercise_name] = []; g[l.exercise_name].push(l) })
    Object.keys(g).forEach(n => g[n].sort((a, b) => a.set_number - b.set_number))
    return g
  }

  const getMaxWeight = (sess, name) => {
    const relevant = sess.exercise_logs?.filter(l => l.exercise_name === name && l.weight_kg != null && l.completed)
    if (!relevant?.length) return null
    return Math.max(...relevant.map(l => l.weight_kg))
  }

  const getAvgWeight = (sess, name) => {
    const relevant = sess.exercise_logs?.filter(l => l.exercise_name === name && l.weight_kg != null && l.completed)
    if (!relevant?.length) return null
    return Math.round((relevant.reduce((s, l) => s + l.weight_kg, 0) / relevant.length) * 10) / 10
  }

  const totalVolume = (sess) => {
    if (!sess.exercise_logs) return 0
    return sess.exercise_logs.filter(l => l.completed && l.weight_kg != null && l.reps != null)
      .reduce((s, l) => s + l.weight_kg * l.reps, 0)
  }

  // Find the session ~4 weeks before the given session (same day_number)
  const getLastMonthSession = (currentSess) => {
    const currentDate = new Date(currentSess.date)
    const fourWeeksAgo = new Date(currentDate)
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28)

    const sameDaySessions = sessions.filter(
      s => s.day_number === currentSess.day_number && s.id !== currentSess.id && new Date(s.date) < currentDate
    )
    if (!sameDaySessions.length) return null

    // Find the session closest to 4 weeks ago
    return sameDaySessions.reduce((best, s) => {
      const sDiff = Math.abs(new Date(s.date) - fourWeeksAgo)
      const bDiff = Math.abs(new Date(best.date) - fourWeeksAgo)
      return sDiff < bDiff ? s : best
    })
  }

  // Get previous session (most recent before current)
  const getPrevSession = (currentSess) => {
    return sessions.find(s => s.day_number === currentSess.day_number && s.date < currentSess.date) || null
  }

  const diffLabel = (cur, prev) => {
    if (cur == null || prev == null) return null
    const diff = Math.round((cur - prev) * 10) / 10
    if (diff > 0) return { label: `↑ +${diff}kg`, color: '#22c55e' }
    if (diff < 0) return { label: `↓ ${diff}kg`, color: '#f87171' }
    return { label: '→ same', color: '#555' }
  }

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}><div className="spinner" /></div>

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '90px' }}>
      <div style={{
        padding: '24px 16px 16px',
        background: 'rgba(7,7,11,0.85)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        position: 'sticky', top: 0, zIndex: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button onClick={() => navigate('/dashboard')} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '20px' }}>←</button>
          <h1 style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '-0.3px' }}>History</h1>
          {sessions.length > 0 && <span style={{ fontSize: '12px', color: '#333', marginLeft: 'auto' }}>{sessions.length} sessions</span>}
        </div>
      </div>

      {sessions.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '55vh', color: '#333' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
          <p style={{ fontSize: '16px', color: '#555' }}>No workouts logged yet</p>
          <p style={{ fontSize: '13px', marginTop: '8px' }}>Start a session to see your history</p>
        </div>
      ) : (
        <div style={{ padding: '14px' }}>
          {sessions.map(sess => {
            const day = getDay(sess.day_number)
            const exGroups = groupByExercise(sess.exercise_logs)
            const isOpen = expanded === sess.id
            const vol = totalVolume(sess)
            const completedCount = sess.exercise_logs?.filter(l => l.completed).length || 0
            const isComparing = compareMode[sess.id]
            const lastMonthSess = getLastMonthSession(sess)
            const prevSess = getPrevSession(sess)

            return (
              <div key={sess.id} style={{
                ...glass, borderRadius: '16px', marginBottom: '10px', overflow: 'hidden',
                boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
              }}>
                {/* Session header */}
                <button onClick={() => setExpanded(isOpen ? null : sess.id)} style={{
                  width: '100%', padding: '15px 16px', display: 'flex', alignItems: 'center',
                  background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', gap: '12px',
                }}>
                  <div style={{
                    width: '4px', alignSelf: 'stretch', minHeight: '40px',
                    background: `linear-gradient(180deg, ${day?.accent || '#555'}, ${day?.accent || '#555'}66)`,
                    borderRadius: '2px', flexShrink: 0,
                    boxShadow: `0 0 8px ${day?.accent || '#555'}55`,
                  }} />

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontSize: '15px', fontWeight: 700, color: '#eee' }}>{day?.name || `Day ${sess.day_number}`}</div>
                        <div style={{ fontSize: '12px', color: '#444', marginTop: '2px' }}>
                          {new Date(sess.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        {sess.completed && <div style={{ fontSize: '11px', color: '#22c55e', fontWeight: 700 }}>DONE</div>}
                        <div style={{ fontSize: '11px', color: '#333', marginTop: '2px' }}>{completedCount} sets · {Math.round(vol).toLocaleString()}kg vol</div>
                      </div>
                    </div>
                  </div>

                  <span style={{ color: '#333', fontSize: '12px', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}>▼</span>
                </button>

                {isOpen && (
                  <div style={{ padding: '0 16px 16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    {/* Compare toggle */}
                    {(lastMonthSess || prevSess) && (
                      <div style={{ display: 'flex', gap: '8px', marginTop: '14px', marginBottom: '4px' }}>
                        <button onClick={() => setCompareMode(p => ({ ...p, [sess.id]: !isComparing }))} style={{
                          padding: '7px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 700,
                          background: isComparing ? 'rgba(168,85,247,0.2)' : 'rgba(255,255,255,0.05)',
                          color: isComparing ? '#a855f7' : '#555',
                          borderWidth: '1px', borderStyle: 'solid', borderColor: isComparing ? 'rgba(168,85,247,0.3)' : 'rgba(255,255,255,0.08)',
                        }}>
                          {isComparing ? '✕ Hide compare' : '⚡ Compare to last month'}
                        </button>
                      </div>
                    )}

                    {/* Compare legend */}
                    {isComparing && lastMonthSess && (
                      <div style={{ display: 'flex', gap: '12px', margin: '10px 0 4px', fontSize: '11px', fontWeight: 700 }}>
                        <span style={{ color: '#eee' }}>■ This session</span>
                        <span style={{ color: '#a855f7' }}>■ {new Date(lastMonthSess.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                      </div>
                    )}

                    {/* Exercises */}
                    {Object.keys(exGroups).length === 0 ? (
                      <p style={{ fontSize: '13px', color: '#333', marginTop: '14px' }}>No sets logged.</p>
                    ) : (
                      Object.entries(exGroups).map(([exName, exLogs]) => {
                        const curMax = getMaxWeight(sess, exName)
                        const curAvg = getAvgWeight(sess, exName)

                        // vs previous session
                        const prevMax = prevSess ? getMaxWeight(prevSess, exName) : null
                        const vsPrev = diffLabel(curMax, prevMax)

                        // vs last month
                        const lmMax = lastMonthSess ? getMaxWeight(lastMonthSess, exName) : null
                        const vsMonth = diffLabel(curMax, lmMax)
                        const lmLogs = lastMonthSess ? groupByExercise(lastMonthSess.exercise_logs)[exName] : null

                        return (
                          <div key={exName} style={{ marginTop: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', gap: '8px' }}>
                              <span style={{ fontSize: '13px', fontWeight: 700, color: '#ddd', flex: 1 }}>{exName}</span>
                              <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                                {vsPrev && !isComparing && (
                                  <span style={{ fontSize: '11px', fontWeight: 700, color: vsPrev.color, padding: '3px 7px', background: `${vsPrev.color}18`, borderRadius: '6px' }}>
                                    {vsPrev.label}
                                  </span>
                                )}
                                {isComparing && vsMonth && (
                                  <span style={{ fontSize: '11px', fontWeight: 700, color: vsMonth.color, padding: '3px 7px', background: `${vsMonth.color}18`, borderRadius: '6px' }}>
                                    vs month: {vsMonth.label}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* This session sets */}
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                              {exLogs.map(log => (
                                <div key={log.id} style={{
                                  padding: '6px 10px', borderRadius: '8px', fontSize: '13px',
                                  background: log.completed ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)',
                                  border: '1px solid rgba(255,255,255,0.08)',
                                  color: log.completed ? '#ccc' : '#444',
                                  fontWeight: log.completed ? 600 : 400,
                                }}>
                                  {log.weight_kg != null ? `${log.weight_kg}kg` : '—'} × {log.reps != null ? log.reps : '—'}
                                </div>
                              ))}
                            </div>

                            {/* Last month sets comparison */}
                            {isComparing && lmLogs && lmLogs.length > 0 && (
                              <div style={{ marginTop: '6px' }}>
                                <div style={{ fontSize: '11px', color: '#a855f7', marginBottom: '5px', fontWeight: 600 }}>
                                  {new Date(lastMonthSess.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </div>
                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                  {lmLogs.map(log => (
                                    <div key={log.id} style={{
                                      padding: '6px 10px', borderRadius: '8px', fontSize: '13px',
                                      background: 'rgba(168,85,247,0.08)',
                                      border: '1px solid rgba(168,85,247,0.2)',
                                      color: '#a855f7', fontWeight: 600,
                                    }}>
                                      {log.weight_kg != null ? `${log.weight_kg}kg` : '—'} × {log.reps != null ? log.reps : '—'}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {isComparing && !lmLogs && lastMonthSess && (
                              <div style={{ fontSize: '11px', color: '#333', marginTop: '6px' }}>No data for this exercise last month</div>
                            )}
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
