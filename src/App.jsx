import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { RoutineProvider } from './lib/routineContext'
import Auth from './components/Auth'
import Dashboard from './components/Dashboard'
import WorkoutSession from './components/WorkoutSession'
import History from './components/History'
import RoutineEditor from './components/RoutineEditor'

function AuthedApp({ session }) {
  return (
    <RoutineProvider session={session}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard session={session} />} />
        <Route path="/session/:dayNumber" element={<WorkoutSession session={session} />} />
        <Route path="/history" element={<History session={session} />} />
        <Route path="/routine" element={<RoutineEditor />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </RoutineProvider>
  )
}

export default function App() {
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => setSession(session))
    return () => subscription.unsubscribe()
  }, [])

  if (session === undefined) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#07070b' }}>
        <div className="spinner" />
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={!session ? <Auth /> : <Navigate to="/dashboard" replace />} />
        <Route path="/*" element={session ? <AuthedApp session={session} /> : <Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
