import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getDay, getTotalSets } from '../lib/workoutData'

export default function WorkoutSession({ session }) {
  const { dayNumber } = useParams()
  const navigate = useNavigate()
  const day = getDay(parseInt(dayNumber))

  const [workoutSession, setWorkoutSession] = useState(null)
  const [logs, setLogs] = useState({})
  const [inputs, setInputs] = useState({})
  const [expanded, setExpanded] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(null)
  const [prevWeights, setPrevWeights] = useState({})

  useEffect(() => {
    if (!day) { navigate('/dashboard'); return }
    initSession()
  }, [dayNumber])

  const initSession = async () => {
    const today = new Date().toISOString().split('T')[0]

    const { data: existingData } = await supabase
      .from('workout_sessions')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('day_number', parseInt(dayNumber))
      .eq('date', today)
      .order('created_at', { ascending: false })
      .limit(1)

    let sess = existingData?.[0] || null

    if (!sess) {
      const { data: newSession } = await supabase
        .from('workout_sessions')
        .insert({ user_id: session.user.id, day_number: parseInt(dayNumber), date: today, completed: false })
        .select()
        .single()
      sess = newSession
    }

    if (!sess) { navigate('/dashboard'); return }
    setWorkoutSession(sess)

    const { data: existingLogs } = await supabase
      .from('exercise_logs')
      .select('*')
      .eq('session_id', sess.id)

    const logsMap = {}
    const inputsMap = {}
    if (existingLogs) {
      existingLogs.forEach((log) => {
        const key = `${log.exercise_name}__${log.set_number}`
        logsMap[key] = log
        inputsMap[key] = {
          weight: log.weight_kg != null ? log.weight_kg.toString() : '',
          reps: log.reps != null ? log.reps.toString() : '',
        }
      })
    }
    setLogs(logsMap)
    setInputs(inputsMap)

    const { data: prevSessionData } = await supabase
      .from('workout_sessions')
      .select('id')
      .eq('user_id', session.user.id)
      .eq('day_number', parseInt(dayNumber))
      .neq('id', sess.id)
      .order('date', { ascending: false })
      .limit(1)

    const prevSess = prevSessionData?.[0] || null
    if (prevSess) {
      const { data: prevLogs } = await supabase
        .from('exercise_logs')
        .select('exercise_name, weight_kg')
        .eq('session_id', prevSess.id)
        .eq('completed', true)

      if (prevLogs) {
        const grouped = {}
        prevLogs.forEach((l) => {
          if (l.weight_kg == null) return
          if (!grouped[l.exercise_name]) grouped[l.exercise_name] = []
          grouped[l.exercise_name].push(l.weight_kg)
        })
        const avgs = {}
        Object.keys(grouped).forEach((name) => {
          const arr = grouped[name]
          avgs[name] = Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10
        })
        setPrevWeights(avgs)
      }
    }

    setLoading(false)
  }

  const key = (exerciseName, setNum) => `${exerciseName}__${setNum}`

  const getInput = (exerciseName, setNum, field) =>
    inputs[key(exerciseName, setNum)]?.[field] ?? ''

  const setInput = (exerciseName, setNum, field, value) => {
    const k = key(exerciseName, setNum)
    setInputs((prev) => ({ ...prev, [k]: { ...prev[k], [field]: value } }))
  }

  const isCompleted = (exerciseName, setNum) =>
    !!logs[key(exerciseName, setNum)]?.completed

  const logSet = async (exercise, setNum) => {
    const k = key(exercise.name, setNum)
    const inp = inputs[k] || {}
    const weight = inp.weight !== '' ? parseFloat(inp.weight) : null
    const reps = inp.reps !== '' ? parseInt(inp.reps) : null

    setSaving(k)
    const existing = logs[k]

    if (existing?.id) {
      const { data } = await supabase
        .from('exercise_logs')
        .update({ weight_kg: weight, reps, completed: true })
        .eq('id', existing.id)
        .select()
        .single()
      if (data) setLogs((prev) => ({ ...prev, [k]: data }))
    } else {
      const { data } = await supabase
        .from('exercise_logs')
        .insert({
          session_id: workoutSession.id,
          exercise_name: exercise.name,
          set_number: setNum,
          weight_kg: weight,
          reps,
          completed: true,
        })
        .select()
        .single()
      if (data) setLogs((prev) => ({ ...prev, [k]: data }))
    }
    setSaving(null)
  }

  const completedSetsCount = () =>
    Object.values(logs).filter((l) => l.completed).length

  const exCompletedCount = (exerciseName, totalSets) => {
    let n = 0
    for (let i = 1; i <= totalSets; i++) {
      if (isCompleted(exerciseName, i)) n++
    }
    return n
  }

  const completeWorkout = async () => {
    await supabase.from('workout_sessions').update({ completed: true }).eq('id', workoutSession.id)
    navigate('/dashboard')
  }

  if (!day) return null

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div className="spinner" />
      </div>
    )
  }

  const completedSets = completedSetsCount()
  const totalSets = getTotalSets(day)
  const progress = totalSets > 0 ? (completedSets / totalSets) * 100 : 0
  const allDone = completedSets >= totalSets

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '32px' }}>
      {/* Sticky header */}
      <div style={{
        position: 'sticky',
        top: 0,
        background: '#0d0d0d',
        borderBottom: '1px solid #1a1a1a',
        padding: '14px 16px 14px',
        zIndex: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
          <button
            onClick={() => navigate('/dashboard')}
            style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '20px', lineHeight: 1, padding: '2px 6px 2px 0' }}
          >
            ←
          </button>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '11px', color: day.accent, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Day {day.day}
            </div>
            <h1 style={{ fontSize: '18px', fontWeight: 700, lineHeight: 1.2 }}>{day.name}</h1>
          </div>
          <span style={{ fontSize: '24px' }}>{day.icon}</span>
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '7px' }}>
            <span style={{ fontSize: '12px', color: '#444' }}>{completedSets} / {totalSets} sets</span>
            <span style={{ fontSize: '12px', color: allDone ? '#22c55e' : '#555' }}>
              {allDone ? '✓ All sets done!' : `${Math.round(progress)}%`}
            </span>
          </div>
          <div style={{ height: '4px', background: '#1a1a1a', borderRadius: '2px' }}>
            <div style={{
              height: '100%',
              width: `${progress}%`,
              background: allDone ? '#22c55e' : day.accent,
              borderRadius: '2px',
              transition: 'width 0.4s ease',
            }} />
          </div>
        </div>
      </div>

      {/* Exercise list */}
      <div style={{ padding: '12px 14px' }}>
        {day.exercises.map((exercise, idx) => {
          const isOpen = expanded === exercise.name
          const doneCount = exCompletedCount(exercise.name, exercise.sets)
          const exAllDone = doneCount === exercise.sets
          const prev = prevWeights[exercise.name]

          return (
            <div
              key={exercise.name}
              style={{
                background: '#161616',
                border: `1px solid ${exAllDone ? 'rgba(34,197,94,0.25)' : '#222'}`,
                borderRadius: '14px',
                marginBottom: '10px',
                overflow: 'hidden',
              }}
            >
              <button
                onClick={() => setExpanded(isOpen ? null : exercise.name)}
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
                  width: '30px',
                  height: '30px',
                  borderRadius: '8px',
                  background: exAllDone ? 'rgba(34,197,94,0.12)' : '#222',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: exAllDone ? '#22c55e' : '#444',
                  flexShrink: 0,
                }}>
                  {exAllDone ? '✓' : idx + 1}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '15px', fontWeight: 600, color: '#eee', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {exercise.name}
                  </div>
                  <div style={{ fontSize: '12px', color: '#444', marginTop: '2px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <span>{exercise.sets} sets · {exercise.repsMin}–{exercise.repsMax}{exercise.unit ? exercise.unit : ''}</span>
                    {prev != null && <span style={{ color: '#333' }}>prev: {prev}kg</span>}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                  <span style={{ fontSize: '12px', color: exAllDone ? '#22c55e' : '#444' }}>
                    {doneCount}/{exercise.sets}
                  </span>
                  <span style={{
                    color: '#333',
                    fontSize: '12px',
                    display: 'inline-block',
                    transform: isOpen ? 'rotate(180deg)' : 'none',
                    transition: 'transform 0.2s',
                  }}>▼</span>
                </div>
              </button>

              {isOpen && (
                <div style={{ padding: '0 14px 14px', borderTop: '1px solid #1e1e1e' }}>
                  <div style={{ paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {Array.from({ length: exercise.sets }, (_, i) => i + 1).map((setNum) => {
                      const k = key(exercise.name, setNum)
                      const done = isCompleted(exercise.name, setNum)
                      const isSaving = saving === k

                      return (
                        <div
                          key={setNum}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '11px 12px',
                            background: done ? 'rgba(34,197,94,0.05)' : '#1e1e1e',
                            borderRadius: '10px',
                            border: `1px solid ${done ? 'rgba(34,197,94,0.15)' : '#272727'}`,
                          }}
                        >
                          <span style={{ fontSize: '12px', color: done ? '#22c55e' : '#444', fontWeight: 600, width: '18px', flexShrink: 0 }}>
                            {setNum}
                          </span>

                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '10px', color: '#3a3a3a', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>kg</div>
                            <input
                              type="number"
                              inputMode="decimal"
                              value={getInput(exercise.name, setNum, 'weight')}
                              onChange={(e) => setInput(exercise.name, setNum, 'weight', e.target.value)}
                              placeholder={prev != null ? prev.toString() : '0'}
                              disabled={done}
                              style={{
                                width: '100%',
                                padding: '8px 10px',
                                background: done ? 'transparent' : '#141414',
                                border: `1px solid ${done ? 'transparent' : '#2a2a2a'}`,
                                borderRadius: '8px',
                                color: done ? '#4ade80' : '#f0f0f0',
                                fontSize: '16px',
                                fontWeight: 600,
                                outline: 'none',
                              }}
                            />
                          </div>

                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '10px', color: '#3a3a3a', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              {exercise.unit === 'sec' ? 'sec' : 'reps'}
                            </div>
                            <input
                              type="number"
                              inputMode="numeric"
                              value={getInput(exercise.name, setNum, 'reps')}
                              onChange={(e) => setInput(exercise.name, setNum, 'reps', e.target.value)}
                              placeholder={exercise.repsMin.toString()}
                              disabled={done}
                              style={{
                                width: '100%',
                                padding: '8px 10px',
                                background: done ? 'transparent' : '#141414',
                                border: `1px solid ${done ? 'transparent' : '#2a2a2a'}`,
                                borderRadius: '8px',
                                color: done ? '#4ade80' : '#f0f0f0',
                                fontSize: '16px',
                                fontWeight: 600,
                                outline: 'none',
                              }}
                            />
                          </div>

                          <button
                            onClick={() => !done && !isSaving && logSet(exercise, setNum)}
                            disabled={done || isSaving}
                            style={{
                              width: '42px',
                              height: '42px',
                              borderRadius: '10px',
                              border: 'none',
                              background: done ? 'rgba(34,197,94,0.12)' : '#a855f7',
                              color: done ? '#22c55e' : '#fff',
                              fontSize: '16px',
                              cursor: done ? 'default' : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              transition: 'all 0.15s',
                            }}
                          >
                            {isSaving ? '…' : '✓'}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {allDone && (
          <button
            onClick={completeWorkout}
            style={{
              width: '100%',
              padding: '18px',
              background: '#22c55e',
              color: '#fff',
              border: 'none',
              borderRadius: '14px',
              fontSize: '16px',
              fontWeight: 700,
              cursor: 'pointer',
              marginTop: '8px',
            }}
          >
            Complete Workout 🎉
          </button>
        )}

        {!allDone && completedSets > 0 && (
          <button
            onClick={() => navigate('/dashboard')}
            style={{
              width: '100%',
              padding: '14px',
              background: 'transparent',
              color: '#444',
              border: '1px solid #222',
              borderRadius: '14px',
              fontSize: '14px',
              cursor: 'pointer',
              marginTop: '8px',
            }}
          >
            Save & exit
          </button>
        )}
      </div>
    </div>
  )
}
