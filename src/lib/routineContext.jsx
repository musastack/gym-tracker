import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from './supabase'
import { WORKOUT_DAYS } from './workoutData'

const RoutineContext = createContext(null)

export function RoutineProvider({ session, children }) {
  const [routine, setRoutine] = useState(null)
  const [routineLoading, setRoutineLoading] = useState(true)

  useEffect(() => { loadRoutine() }, [])

  const loadRoutine = async () => {
    const { data } = await supabase
      .from('routines')
      .select('*')
      .eq('user_id', session.user.id)
      .maybeSingle()

    if (data?.days?.length) {
      setRoutine(data.days)
    } else {
      setRoutine(WORKOUT_DAYS)
      await supabase.from('routines').upsert({ user_id: session.user.id, days: WORKOUT_DAYS })
    }
    setRoutineLoading(false)
  }

  const saveRoutine = async (newDays) => {
    setRoutine(newDays)
    await supabase.from('routines').upsert({
      user_id: session.user.id,
      days: newDays,
      updated_at: new Date().toISOString(),
    })
  }

  const getDay = (dayNumber) => routine?.find(d => d.day === dayNumber) || null
  const getTotalSets = (day) => day.exercises?.reduce((s, ex) => s + ex.sets, 0) || 0

  return (
    <RoutineContext.Provider value={{ routine, saveRoutine, routineLoading, getDay, getTotalSets }}>
      {children}
    </RoutineContext.Provider>
  )
}

export const useRoutine = () => useContext(RoutineContext)
