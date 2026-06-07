import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useRoutine } from '../lib/routineContext'

const glass = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  backdropFilter: 'blur(16px)',
}

const inputStyle = (done) => ({
  width: '100%', padding: '8px 10px',
  background: done ? 'transparent' : 'rgba(255,255,255,0.06)',
  border: `1px solid ${done ? 'transparent' : 'rgba(255,255,255,0.1)'}`,
  borderRadius: '8px',
  color: done ? '#4ade80' : '#f0f0f0',
  fontSize: '16px', fontWeight: 700, outline: 'none',
})

export default function WorkoutSession({ session }) {
  const { dayNumber } = useParams()
  const navigate = useNavigate()
  const { getDay, getTotalSets } = useRoutine()
  const day = getDay(parseInt(dayNumber))

  const [workoutSession, setWorkoutSession] = useState(null)
  const [logs, setLogs] = useState({})
  const [inputs, setInputs] = useState({})
  const [expanded, setExpanded] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(null)
  const [prevWeights, setPrevWeights] = useState({})

  // extra sets per exercise beyond default: { exerciseName: count }
  const [extraSets, setExtraSets] = useState({})
  // sets being edited after completion
  const [editingSet, setEditingSet] = useState(null)
  // custom exercises added this session
  const [customExercises, setCustomExercises] = useState([])
  // exercise name overrides: { originalName: newName }
  const [nameOverrides, setNameOverrides] = useState({})
  // which exercise name is being edited inline
  const [editingName, setEditingName] = useState(null)
  const [nameInput, setNameInput] = useState('')
  // add exercise form
  const [showAddEx, setShowAddEx] = useState(false)
  const [newEx, setNewEx] = useState({ name: '', sets: '3', repsMin: '8', repsMax: '12' })

  useEffect(() => {
    if (!day) { navigate('/dashboard'); return }
    initSession()
  }, [dayNumber])

  const initSession = async () => {
    const today = new Date().toISOString().split('T')[0]
    const { data: existing } = await supabase.from('workout_sessions').select('*')
      .eq('user_id', session.user.id).eq('day_number', parseInt(dayNumber)).eq('date', today)
      .order('created_at', { ascending: false }).limit(1)

    let sess = existing?.[0] || null
    if (!sess) {
      const { data } = await supabase.from('workout_sessions')
        .insert({ user_id: session.user.id, day_number: parseInt(dayNumber), date: today, completed: false })
        .select().single()
      sess = data
    }
    if (!sess) { navigate('/dashboard'); return }
    setWorkoutSession(sess)

    const { data: existingLogs } = await supabase.from('exercise_logs').select('*').eq('session_id', sess.id)
    const logsMap = {}, inputsMap = {}
    if (existingLogs) {
      existingLogs.forEach(log => {
        const k = `${log.exercise_name}__${log.set_number}`
        logsMap[k] = log
        inputsMap[k] = { weight: log.weight_kg != null ? String(log.weight_kg) : '', reps: log.reps != null ? String(log.reps) : '' }
      })
      // restore extra sets from logged data
      const maxSets = {}
      existingLogs.forEach(log => {
        const base = day.exercises.find(e => e.name === log.exercise_name)?.sets || 0
        if (!maxSets[log.exercise_name] || log.set_number > maxSets[log.exercise_name]) {
          maxSets[log.exercise_name] = log.set_number
        }
        if (base > 0 && log.set_number > base) {
          setExtraSets(prev => ({ ...prev, [log.exercise_name]: Math.max(prev[log.exercise_name] || 0, log.set_number - base) }))
        }
      })
      // restore custom exercises
      const knownNames = new Set(day.exercises.map(e => e.name))
      const customNames = [...new Set(existingLogs.filter(l => !knownNames.has(l.exercise_name)).map(l => l.exercise_name))]
      if (customNames.length > 0) {
        setCustomExercises(customNames.map(name => {
          const setsForEx = existingLogs.filter(l => l.exercise_name === name)
          const maxSet = Math.max(...setsForEx.map(l => l.set_number))
          return { name, sets: maxSet, repsMin: 8, repsMax: 12 }
        }))
      }
    }
    setLogs(logsMap)
    setInputs(inputsMap)

    const { data: prevSessionData } = await supabase.from('workout_sessions').select('id')
      .eq('user_id', session.user.id).eq('day_number', parseInt(dayNumber)).neq('id', sess.id)
      .order('date', { ascending: false }).limit(1)
    const prevSess = prevSessionData?.[0]
    if (prevSess) {
      const { data: prevLogs } = await supabase.from('exercise_logs').select('exercise_name, weight_kg')
        .eq('session_id', prevSess.id).eq('completed', true)
      if (prevLogs) {
        const grouped = {}
        prevLogs.forEach(l => { if (l.weight_kg != null) { if (!grouped[l.exercise_name]) grouped[l.exercise_name] = []; grouped[l.exercise_name].push(l.weight_kg) } })
        const avgs = {}
        Object.keys(grouped).forEach(n => { const a = grouped[n]; avgs[n] = Math.round((a.reduce((x,y)=>x+y,0)/a.length)*10)/10 })
        setPrevWeights(avgs)
      }
    }
    setLoading(false)
  }

  const k = (name, setNum) => `${name}__${setNum}`
  const getInput = (name, setNum, field) => inputs[k(name, setNum)]?.[field] ?? ''
  const setInput = (name, setNum, field, val) => {
    const key = k(name, setNum)
    setInputs(prev => ({ ...prev, [key]: { ...prev[key], [field]: val } }))
  }
  const isCompleted = (name, setNum) => !!logs[k(name, setNum)]?.completed && editingSet !== k(name, setNum)

  const logSet = async (exercise, setNum) => {
    const key = k(exercise.name, setNum)
    const inp = inputs[key] || {}
    const weight = inp.weight !== '' ? parseFloat(inp.weight) : null
    const reps = inp.reps !== '' ? parseInt(inp.reps) : null
    setSaving(key)
    const existing = logs[key]
    if (existing?.id) {
      const { data } = await supabase.from('exercise_logs').update({ weight_kg: weight, reps, completed: true }).eq('id', existing.id).select().single()
      if (data) setLogs(prev => ({ ...prev, [key]: data }))
    } else {
      const { data } = await supabase.from('exercise_logs').insert({ session_id: workoutSession.id, exercise_name: exercise.name, set_number: setNum, weight_kg: weight, reps, completed: true }).select().single()
      if (data) setLogs(prev => ({ ...prev, [key]: data }))
    }
    if (editingSet === key) setEditingSet(null)
    setSaving(null)
  }

  const addSet = (exerciseName) => {
    setExtraSets(prev => ({ ...prev, [exerciseName]: (prev[exerciseName] || 0) + 1 }))
  }

  const getSetsForExercise = (exercise) => exercise.sets + (extraSets[exercise.name] || 0)

  const startEditName = (exercise) => {
    setEditingName(exercise.name)
    setNameInput(nameOverrides[exercise.name] || exercise.name)
  }

  const saveEditName = async (originalName) => {
    const trimmed = nameInput.trim()
    if (!trimmed || trimmed === originalName) { setEditingName(null); return }
    setNameOverrides(prev => ({ ...prev, [originalName]: trimmed }))
    // update existing logs in DB
    const logsToUpdate = Object.values(logs).filter(l => l.exercise_name === originalName && l.id)
    for (const log of logsToUpdate) {
      await supabase.from('exercise_logs').update({ exercise_name: trimmed }).eq('id', log.id)
    }
    // re-key the logs and inputs in state
    setLogs(prev => {
      const next = {}
      Object.entries(prev).forEach(([key, val]) => {
        if (val.exercise_name === originalName) {
          const newKey = k(trimmed, val.set_number)
          next[newKey] = { ...val, exercise_name: trimmed }
        } else {
          next[key] = val
        }
      })
      return next
    })
    setInputs(prev => {
      const next = {}
      Object.entries(prev).forEach(([key, val]) => {
        const [exName, setNum] = key.split('__')
        if (exName === originalName) next[k(trimmed, setNum)] = val
        else next[key] = val
      })
      return next
    })
    setExtraSets(prev => {
      const next = { ...prev }
      if (next[originalName] !== undefined) { next[trimmed] = next[originalName]; delete next[originalName] }
      return next
    })
    setCustomExercises(prev => prev.map(ex => ex.name === originalName ? { ...ex, name: trimmed } : ex))
    setEditingName(null)
  }

  const addCustomExercise = () => {
    const name = newEx.name.trim()
    if (!name) return
    const ex = { name, sets: parseInt(newEx.sets) || 3, repsMin: parseInt(newEx.repsMin) || 8, repsMax: parseInt(newEx.repsMax) || 12 }
    setCustomExercises(prev => [...prev, ex])
    setNewEx({ name: '', sets: '3', repsMin: '8', repsMax: '12' })
    setShowAddEx(false)
    setExpanded(name)
  }

  const allExercises = [...day.exercises, ...customExercises]

  const completedSetsCount = () => Object.values(logs).filter(l => l.completed).length
  const exDoneCount = (name, total) => { let n = 0; for (let i = 1; i <= total; i++) if (isCompleted(name, i)) n++; return n }

  const completeWorkout = async () => {
    await supabase.from('workout_sessions').update({ completed: true }).eq('id', workoutSession.id)
    navigate('/dashboard')
  }

  if (!day) return null
  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}><div className="spinner" /></div>

  const completedSets = completedSetsCount()
  const totalSets = allExercises.reduce((s, ex) => s + getSetsForExercise(ex), 0)
  const progress = totalSets > 0 ? (completedSets / totalSets) * 100 : 0
  const allDone = completedSets >= totalSets && totalSets > 0

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '40px' }}>
      {/* Sticky header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 20,
        background: 'rgba(7,7,11,0.85)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        padding: '14px 16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
          <button onClick={() => navigate('/dashboard')} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '20px', lineHeight: 1 }}>←</button>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '11px', color: day.accent, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Day {day.day}</div>
            <h1 style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '-0.3px' }}>{day.name}</h1>
          </div>
          <span style={{ fontSize: '24px' }}>{day.icon}</span>
        </div>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '7px' }}>
            <span style={{ fontSize: '12px', color: '#444' }}>{completedSets} / {totalSets} sets</span>
            <span style={{ fontSize: '12px', fontWeight: 600, color: allDone ? '#22c55e' : '#555' }}>{allDone ? '✓ All done!' : `${Math.round(progress)}%`}</span>
          </div>
          <div style={{ height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px' }}>
            <div style={{
              height: '100%', width: `${progress}%`,
              background: allDone ? '#22c55e' : `linear-gradient(90deg, ${day.accent}, ${day.accent}cc)`,
              borderRadius: '2px', transition: 'width 0.4s ease',
              boxShadow: allDone ? '0 0 10px rgba(34,197,94,0.6)' : `0 0 10px ${day.accent}55`,
            }} />
          </div>
        </div>
      </div>

      {/* Exercises */}
      <div style={{ padding: '12px 14px' }}>
        {allExercises.map((exercise, idx) => {
          const displayName = nameOverrides[exercise.name] || exercise.name
          const totalForEx = getSetsForExercise(exercise)
          const doneCount = exDoneCount(exercise.name, totalForEx)
          const exAllDone = doneCount === totalForEx
          const prev = prevWeights[exercise.name] || prevWeights[displayName]
          const isOpen = expanded === exercise.name
          const isRenamingThis = editingName === exercise.name

          return (
            <div key={exercise.name} style={{
              ...glass, borderRadius: '16px', marginBottom: '10px', overflow: 'hidden',
              border: `1px solid ${exAllDone ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.08)'}`,
              boxShadow: exAllDone ? '0 0 20px rgba(34,197,94,0.1)' : '0 4px 20px rgba(0,0,0,0.3)',
            }}>
              {/* Exercise header */}
              <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '30px', height: '30px', borderRadius: '8px', flexShrink: 0,
                  background: exAllDone ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.06)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '13px', fontWeight: 700, color: exAllDone ? '#22c55e' : '#555',
                }}>
                  {exAllDone ? '✓' : idx + 1}
                </div>

                <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => !isRenamingThis && setExpanded(isOpen ? null : exercise.name)}>
                  {isRenamingThis ? (
                    <input
                      autoFocus
                      value={nameInput}
                      onChange={e => setNameInput(e.target.value)}
                      onBlur={() => saveEditName(exercise.name)}
                      onKeyDown={e => { if (e.key === 'Enter') saveEditName(exercise.name); if (e.key === 'Escape') setEditingName(null) }}
                      onClick={e => e.stopPropagation()}
                      style={{ background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.4)', borderRadius: '8px', color: '#f0f0f0', fontSize: '15px', fontWeight: 700, padding: '4px 10px', outline: 'none', width: '100%' }}
                    />
                  ) : (
                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#eee', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      onClick={() => setExpanded(isOpen ? null : exercise.name)}>
                      {displayName}
                    </div>
                  )}
                  <div style={{ fontSize: '12px', color: '#444', marginTop: '2px' }}>
                    {totalForEx} sets · {exercise.repsMin}–{exercise.repsMax}{exercise.unit || ''}
                    {prev != null && <span style={{ color: '#333', marginLeft: '6px' }}>prev {prev}kg</span>}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                  <span style={{ fontSize: '12px', color: exAllDone ? '#22c55e' : '#555' }}>{doneCount}/{totalForEx}</span>
                  {/* Rename button */}
                  <button onClick={(e) => { e.stopPropagation(); startEditName(exercise) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#333', fontSize: '14px', padding: '2px' }}>✏️</button>
                  {/* Expand */}
                  <button onClick={() => setExpanded(isOpen ? null : exercise.name)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#333', fontSize: '12px', display: 'inline-block', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</button>
                </div>
              </div>

              {/* Sets */}
              {isOpen && (
                <div style={{ padding: '0 14px 14px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {Array.from({ length: totalForEx }, (_, i) => i + 1).map(setNum => {
                      const key = k(exercise.name, setNum)
                      const done = isCompleted(exercise.name, setNum)
                      const isEditing = editingSet === key
                      const isSaving = saving === key

                      return (
                        <div key={setNum} style={{
                          display: 'flex', alignItems: 'center', gap: '8px', padding: '11px 12px',
                          background: done ? 'rgba(34,197,94,0.06)' : 'rgba(255,255,255,0.03)',
                          borderRadius: '12px',
                          border: `1px solid ${done && !isEditing ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.07)'}`,
                          transition: 'all 0.2s',
                        }}>
                          <span style={{ fontSize: '12px', color: done && !isEditing ? '#22c55e' : '#444', fontWeight: 700, width: '18px', flexShrink: 0 }}>{setNum}</span>

                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '10px', color: '#3a3a3a', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>kg</div>
                            <input type="number" inputMode="decimal"
                              value={getInput(exercise.name, setNum, 'weight')}
                              onChange={e => setInput(exercise.name, setNum, 'weight', e.target.value)}
                              placeholder={prev != null ? String(prev) : '0'}
                              disabled={done && !isEditing}
                              style={inputStyle(done && !isEditing)}
                            />
                          </div>

                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '10px', color: '#3a3a3a', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{exercise.unit === 'sec' ? 'sec' : 'reps'}</div>
                            <input type="number" inputMode="numeric"
                              value={getInput(exercise.name, setNum, 'reps')}
                              onChange={e => setInput(exercise.name, setNum, 'reps', e.target.value)}
                              placeholder={String(exercise.repsMin)}
                              disabled={done && !isEditing}
                              style={inputStyle(done && !isEditing)}
                            />
                          </div>

                          {done && !isEditing ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flexShrink: 0 }}>
                              {/* Done badge */}
                              <div style={{ width: '42px', height: '30px', borderRadius: '8px', background: 'rgba(34,197,94,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#22c55e', fontSize: '16px' }}>✓</div>
                              {/* Edit button */}
                              <button onClick={() => setEditingSet(key)} style={{ width: '42px', height: '22px', borderRadius: '6px', background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.2)', color: '#a855f7', fontSize: '10px', cursor: 'pointer', fontWeight: 700 }}>EDIT</button>
                            </div>
                          ) : (
                            <button onClick={() => !isSaving && logSet(exercise, setNum)} disabled={isSaving} style={{
                              width: '42px', height: '54px', borderRadius: '10px', border: 'none', flexShrink: 0,
                              background: isEditing ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'linear-gradient(135deg, #7c3aed, #a855f7)',
                              color: '#fff', fontSize: isEditing ? '10px' : '18px', fontWeight: isEditing ? 800 : 400,
                              cursor: isSaving ? 'not-allowed' : 'pointer',
                              boxShadow: isEditing ? '0 0 15px rgba(245,158,11,0.4)' : '0 0 15px rgba(168,85,247,0.4)',
                            }}>
                              {isSaving ? '…' : isEditing ? 'SAVE' : '✓'}
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {/* Add set button */}
                  <button onClick={() => addSet(exercise.name)} style={{
                    marginTop: '10px', width: '100%', padding: '10px',
                    background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.1)',
                    borderRadius: '10px', color: '#555', fontSize: '13px', cursor: 'pointer',
                    fontWeight: 600, transition: 'all 0.2s',
                  }}>
                    + Add Set
                  </button>
                </div>
              )}
            </div>
          )
        })}

        {/* Add Exercise */}
        {!showAddEx ? (
          <button onClick={() => setShowAddEx(true)} style={{
            width: '100%', padding: '14px',
            background: 'rgba(168,85,247,0.08)', border: '1px dashed rgba(168,85,247,0.3)',
            borderRadius: '14px', color: '#a855f7', fontSize: '14px', fontWeight: 700,
            cursor: 'pointer', marginBottom: '12px',
          }}>
            + Add Exercise
          </button>
        ) : (
          <div style={{ ...glass, borderRadius: '16px', padding: '16px', marginBottom: '12px', border: '1px solid rgba(168,85,247,0.3)' }}>
            <p style={{ fontSize: '13px', fontWeight: 700, color: '#a855f7', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>New Exercise</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input value={newEx.name} onChange={e => setNewEx(p => ({ ...p, name: e.target.value }))} placeholder="Exercise name" style={{ ...inputStyle(false), padding: '12px 14px' }} />
              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '11px', color: '#555', marginBottom: '5px' }}>SETS</div>
                  <input type="number" value={newEx.sets} onChange={e => setNewEx(p => ({ ...p, sets: e.target.value }))} style={{ ...inputStyle(false), padding: '10px 12px' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '11px', color: '#555', marginBottom: '5px' }}>REPS MIN</div>
                  <input type="number" value={newEx.repsMin} onChange={e => setNewEx(p => ({ ...p, repsMin: e.target.value }))} style={{ ...inputStyle(false), padding: '10px 12px' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '11px', color: '#555', marginBottom: '5px' }}>REPS MAX</div>
                  <input type="number" value={newEx.repsMax} onChange={e => setNewEx(p => ({ ...p, repsMax: e.target.value }))} style={{ ...inputStyle(false), padding: '10px 12px' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={addCustomExercise} style={{ flex: 1, padding: '12px', background: 'linear-gradient(135deg, #7c3aed, #a855f7)', border: 'none', borderRadius: '10px', color: '#fff', fontWeight: 700, cursor: 'pointer', boxShadow: '0 0 20px rgba(168,85,247,0.3)' }}>Add</button>
                <button onClick={() => setShowAddEx(false)} style={{ flex: 1, padding: '12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', color: '#555', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Complete / Save & exit */}
        {allDone && (
          <button onClick={completeWorkout} style={{
            width: '100%', padding: '18px',
            background: 'linear-gradient(135deg, #16a34a, #22c55e)',
            color: '#fff', border: 'none', borderRadius: '16px', fontSize: '16px', fontWeight: 800,
            cursor: 'pointer', boxShadow: '0 0 30px rgba(34,197,94,0.4)', letterSpacing: '-0.3px',
          }}>
            Complete Workout 🎉
          </button>
        )}

        {!allDone && completedSets > 0 && (
          <button onClick={() => navigate('/dashboard')} style={{
            width: '100%', padding: '14px', marginTop: '6px',
            background: 'transparent', color: '#333',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '14px', fontSize: '14px', cursor: 'pointer',
          }}>
            Save & exit
          </button>
        )}
      </div>
    </div>
  )
}
