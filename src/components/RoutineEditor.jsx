import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRoutine } from '../lib/routineContext'

const glass = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  backdropFilter: 'blur(16px)',
}

const inp = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '10px',
  color: '#f0f0f0',
  fontSize: '14px',
  padding: '10px 12px',
  outline: 'none',
  width: '100%',
}

const ACCENT_COLORS = ['#a855f7','#3b82f6','#22c55e','#f59e0b','#ef4444','#ec4899','#06b6d4','#f97316']

export default function RoutineEditor() {
  const navigate = useNavigate()
  const { routine, saveRoutine } = useRoutine()
  const [days, setDays] = useState(() => JSON.parse(JSON.stringify(routine || [])))
  const [expandedDay, setExpandedDay] = useState(null)
  const [editingDay, setEditingDay] = useState(null)   // day id being renamed/edited
  const [editingEx, setEditingEx] = useState(null)     // { dayId, exIndex }
  const [addingExTo, setAddingExTo] = useState(null)   // day id adding exercise to
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // -- Day operations --
  const updateDay = (dayId, patch) =>
    setDays(prev => prev.map(d => d.day === dayId ? { ...d, ...patch } : d))

  const moveDay = (idx, dir) => {
    const next = [...days]
    const swap = idx + dir
    if (swap < 0 || swap >= next.length) return
    ;[next[idx], next[swap]] = [next[swap], next[idx]]
    setDays(next)
  }

  const deleteDay = (dayId) => {
    if (!window.confirm('Delete this day?')) return
    setDays(prev => prev.filter(d => d.day !== dayId))
    if (expandedDay === dayId) setExpandedDay(null)
  }

  const addDay = () => {
    const maxId = days.length > 0 ? Math.max(...days.map(d => d.day)) : 0
    const newDay = {
      day: maxId + 1,
      name: 'New Day',
      focus: 'Focus',
      icon: '💪',
      accent: '#a855f7',
      exercises: [],
    }
    setDays(prev => [...prev, newDay])
    setExpandedDay(newDay.day)
    setEditingDay(newDay.day)
  }

  // -- Exercise operations --
  const updateEx = (dayId, exIdx, patch) =>
    setDays(prev => prev.map(d => d.day !== dayId ? d : {
      ...d,
      exercises: d.exercises.map((ex, i) => i === exIdx ? { ...ex, ...patch } : ex)
    }))

  const deleteEx = (dayId, exIdx) =>
    setDays(prev => prev.map(d => d.day !== dayId ? d : {
      ...d, exercises: d.exercises.filter((_, i) => i !== exIdx)
    }))

  const moveEx = (dayId, exIdx, dir) =>
    setDays(prev => prev.map(d => {
      if (d.day !== dayId) return d
      const exs = [...d.exercises]
      const swap = exIdx + dir
      if (swap < 0 || swap >= exs.length) return d
      ;[exs[exIdx], exs[swap]] = [exs[swap], exs[exIdx]]
      return { ...d, exercises: exs }
    }))

  const [newEx, setNewEx] = useState({ name: '', sets: '3', repsMin: '8', repsMax: '12', unit: '' })

  const addExercise = (dayId) => {
    const name = newEx.name.trim()
    if (!name) return
    const ex = { name, type: 'Custom', sets: parseInt(newEx.sets) || 3, repsMin: parseInt(newEx.repsMin) || 8, repsMax: parseInt(newEx.repsMax) || 12, ...(newEx.unit ? { unit: newEx.unit } : {}) }
    setDays(prev => prev.map(d => d.day !== dayId ? d : { ...d, exercises: [...d.exercises, ex] }))
    setNewEx({ name: '', sets: '3', repsMin: '8', repsMax: '12', unit: '' })
    setAddingExTo(null)
  }

  const handleSave = async () => {
    setSaving(true)
    await saveRoutine(days)
    setSaving(false)
    setSaved(true)
    setTimeout(() => { setSaved(false); navigate('/dashboard') }, 800)
  }

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '40px' }}>
      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 20,
        background: 'rgba(7,7,11,0.9)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        padding: '16px',
        display: 'flex', alignItems: 'center', gap: '12px',
      }}>
        <button onClick={() => navigate('/dashboard')} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '20px' }}>←</button>
        <h1 style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '-0.3px', flex: 1 }}>Edit Routine</h1>
        <button onClick={handleSave} disabled={saving} style={{
          padding: '10px 20px', borderRadius: '10px', border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
          background: saved ? '#22c55e' : 'linear-gradient(135deg, #7c3aed, #a855f7)',
          color: '#fff', fontWeight: 700, fontSize: '14px',
          boxShadow: saved ? '0 0 20px rgba(34,197,94,0.4)' : '0 0 20px rgba(168,85,247,0.3)',
          transition: 'all 0.2s',
        }}>
          {saved ? '✓ Saved!' : saving ? 'Saving…' : 'Save'}
        </button>
      </div>

      <div style={{ padding: '14px' }}>
        <p style={{ fontSize: '12px', color: '#444', marginBottom: '16px', paddingLeft: '4px' }}>
          {days.length} day{days.length !== 1 ? 's' : ''} in your routine
        </p>

        {days.map((day, dayIdx) => {
          const isOpen = expandedDay === day.day
          const isEditingThisDay = editingDay === day.day

          return (
            <div key={day.day} style={{
              ...glass, borderRadius: '16px', marginBottom: '10px', overflow: 'hidden',
              border: `1px solid ${isOpen ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.07)'}`,
              boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            }}>
              {/* Day header row */}
              <div style={{ padding: '14px 14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '4px', height: '36px', borderRadius: '2px', background: `linear-gradient(180deg, ${day.accent}, ${day.accent}66)`, flexShrink: 0, boxShadow: `0 0 8px ${day.accent}55` }} />

                <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => setExpandedDay(isOpen ? null : day.day)}>
                  <div style={{ fontSize: '11px', color: day.accent, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{day.exercises.length} exercises</div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: '#eee', letterSpacing: '-0.3px' }}>{day.icon} {day.name}</div>
                  <div style={{ fontSize: '12px', color: '#555' }}>{day.focus}</div>
                </div>

                <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                  <button onClick={() => moveDay(dayIdx, -1)} style={{ ...iconBtn }}>↑</button>
                  <button onClick={() => moveDay(dayIdx, 1)} style={{ ...iconBtn }}>↓</button>
                  <button onClick={() => { setExpandedDay(day.day); setEditingDay(isEditingThisDay ? null : day.day) }} style={{ ...iconBtn, color: isEditingThisDay ? '#a855f7' : '#555' }}>✏️</button>
                  <button onClick={() => deleteDay(day.day)} style={{ ...iconBtn, color: '#ef4444' }}>🗑</button>
                  <button onClick={() => setExpandedDay(isOpen ? null : day.day)} style={{ ...iconBtn, fontSize: '10px', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</button>
                </div>
              </div>

              {/* Day edit fields */}
              {isOpen && isEditingThisDay && (
                <div style={{ padding: '0 14px 14px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <div style={{ flex: 3 }}>
                        <label style={labelStyle}>Day Name</label>
                        <input style={inp} value={day.name} onChange={e => updateDay(day.day, { name: e.target.value })} placeholder="e.g. Upper Push" />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={labelStyle}>Icon</label>
                        <input style={inp} value={day.icon} onChange={e => updateDay(day.day, { icon: e.target.value })} placeholder="💪" />
                      </div>
                    </div>

                    <div>
                      <label style={labelStyle}>Focus / Subtitle</label>
                      <input style={inp} value={day.focus} onChange={e => updateDay(day.day, { focus: e.target.value })} placeholder="e.g. Chest · Shoulders · Triceps" />
                    </div>

                    <div>
                      <label style={labelStyle}>Accent Colour</label>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                        {ACCENT_COLORS.map(c => (
                          <button key={c} onClick={() => updateDay(day.day, { accent: c })} style={{
                            width: '32px', height: '32px', borderRadius: '8px', background: c, border: day.accent === c ? '3px solid #fff' : '3px solid transparent', cursor: 'pointer',
                            boxShadow: day.accent === c ? `0 0 12px ${c}` : 'none', transition: 'all 0.15s',
                          }} />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Exercises list */}
              {isOpen && (
                <div style={{ padding: '0 14px 14px', borderTop: isEditingThisDay ? 'none' : '1px solid rgba(255,255,255,0.06)' }}>
                  {!isEditingThisDay && <div style={{ height: '14px' }} />}

                  {day.exercises.length === 0 && (
                    <p style={{ fontSize: '13px', color: '#333', marginBottom: '12px' }}>No exercises yet — add one below</p>
                  )}

                  {day.exercises.map((ex, exIdx) => {
                    const isEditingThisEx = editingEx?.dayId === day.day && editingEx?.exIdx === exIdx

                    return (
                      <div key={exIdx} style={{
                        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                        borderRadius: '12px', marginBottom: '8px', overflow: 'hidden',
                      }}>
                        {/* Exercise row */}
                        <div style={{ padding: '11px 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '14px', fontWeight: 700, color: '#eee', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ex.name}</div>
                            <div style={{ fontSize: '12px', color: '#444' }}>{ex.sets} sets · {ex.repsMin}–{ex.repsMax}{ex.unit || ' reps'}</div>
                          </div>
                          <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                            <button onClick={() => moveEx(day.day, exIdx, -1)} style={iconBtn}>↑</button>
                            <button onClick={() => moveEx(day.day, exIdx, 1)} style={iconBtn}>↓</button>
                            <button onClick={() => setEditingEx(isEditingThisEx ? null : { dayId: day.day, exIdx })} style={{ ...iconBtn, color: isEditingThisEx ? '#a855f7' : '#555' }}>✏️</button>
                            <button onClick={() => deleteEx(day.day, exIdx)} style={{ ...iconBtn, color: '#ef4444' }}>🗑</button>
                          </div>
                        </div>

                        {/* Exercise edit fields */}
                        {isEditingThisEx && (
                          <div style={{ padding: '0 12px 12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                            <div style={{ paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <div>
                                <label style={labelStyle}>Exercise Name</label>
                                <input style={inp} value={ex.name} onChange={e => updateEx(day.day, exIdx, { name: e.target.value })} />
                              </div>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <div style={{ flex: 1 }}>
                                  <label style={labelStyle}>Sets</label>
                                  <input type="number" style={inp} value={ex.sets} onChange={e => updateEx(day.day, exIdx, { sets: parseInt(e.target.value) || 1 })} />
                                </div>
                                <div style={{ flex: 1 }}>
                                  <label style={labelStyle}>Reps Min</label>
                                  <input type="number" style={inp} value={ex.repsMin} onChange={e => updateEx(day.day, exIdx, { repsMin: parseInt(e.target.value) || 1 })} />
                                </div>
                                <div style={{ flex: 1 }}>
                                  <label style={labelStyle}>Reps Max</label>
                                  <input type="number" style={inp} value={ex.repsMax} onChange={e => updateEx(day.day, exIdx, { repsMax: parseInt(e.target.value) || 1 })} />
                                </div>
                              </div>
                              <div>
                                <label style={labelStyle}>Unit (leave blank for reps, type "sec" for timed)</label>
                                <input style={inp} value={ex.unit || ''} onChange={e => updateEx(day.day, exIdx, { unit: e.target.value })} placeholder="reps" />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}

                  {/* Add exercise form */}
                  {addingExTo === day.day ? (
                    <div style={{ background: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.2)', borderRadius: '12px', padding: '14px', marginTop: '6px' }}>
                      <p style={{ fontSize: '12px', color: '#a855f7', fontWeight: 700, marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>New Exercise</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <input style={inp} placeholder="Exercise name" value={newEx.name} onChange={e => setNewEx(p => ({ ...p, name: e.target.value }))} autoFocus />
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <div style={{ flex: 1 }}><label style={labelStyle}>Sets</label><input type="number" style={inp} value={newEx.sets} onChange={e => setNewEx(p => ({ ...p, sets: e.target.value }))} /></div>
                          <div style={{ flex: 1 }}><label style={labelStyle}>Min</label><input type="number" style={inp} value={newEx.repsMin} onChange={e => setNewEx(p => ({ ...p, repsMin: e.target.value }))} /></div>
                          <div style={{ flex: 1 }}><label style={labelStyle}>Max</label><input type="number" style={inp} value={newEx.repsMax} onChange={e => setNewEx(p => ({ ...p, repsMax: e.target.value }))} /></div>
                        </div>
                        <div><label style={labelStyle}>Unit (optional — e.g. "sec")</label><input style={inp} placeholder="reps" value={newEx.unit} onChange={e => setNewEx(p => ({ ...p, unit: e.target.value }))} /></div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={() => addExercise(day.day)} style={{ flex: 1, padding: '11px', background: 'linear-gradient(135deg, #7c3aed, #a855f7)', border: 'none', borderRadius: '10px', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Add</button>
                          <button onClick={() => setAddingExTo(null)} style={{ flex: 1, padding: '11px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', color: '#555', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => { setAddingExTo(day.day); setNewEx({ name: '', sets: '3', repsMin: '8', repsMax: '12', unit: '' }) }} style={{
                      width: '100%', padding: '11px', marginTop: '6px',
                      background: 'transparent', border: '1px dashed rgba(255,255,255,0.1)',
                      borderRadius: '10px', color: '#555', fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                    }}>
                      + Add Exercise
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {/* Add Day */}
        <button onClick={addDay} style={{
          width: '100%', padding: '16px',
          background: 'rgba(168,85,247,0.08)', border: '1px dashed rgba(168,85,247,0.3)',
          borderRadius: '14px', color: '#a855f7', fontSize: '14px', fontWeight: 700,
          cursor: 'pointer', marginTop: '4px',
        }}>
          + Add Day
        </button>

        {/* Save */}
        <button onClick={handleSave} disabled={saving} style={{
          width: '100%', padding: '18px', marginTop: '12px',
          background: saved ? 'linear-gradient(135deg, #16a34a, #22c55e)' : 'linear-gradient(135deg, #7c3aed, #a855f7)',
          color: '#fff', border: 'none', borderRadius: '16px', fontSize: '16px', fontWeight: 800,
          cursor: saving ? 'not-allowed' : 'pointer',
          boxShadow: saved ? '0 0 30px rgba(34,197,94,0.4)' : '0 0 30px rgba(168,85,247,0.35)',
          letterSpacing: '-0.3px', transition: 'all 0.2s',
        }}>
          {saved ? '✓ Saved!' : saving ? 'Saving…' : 'Save Routine'}
        </button>
      </div>
    </div>
  )
}

const iconBtn = {
  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '7px', color: '#555', cursor: 'pointer', fontSize: '13px',
  width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: 0,
}

const labelStyle = { display: 'block', fontSize: '11px', color: '#444', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.06em' }
