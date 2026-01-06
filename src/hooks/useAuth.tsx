import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { apiFetch } from '../lib/api'

export interface User {
  id: string
  email: string
  name: string
  role: 'user' | 'technician' | 'admin' | 'viewer'
}

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<User>
  signOut: () => Promise<void>
  isAdmin: boolean
  isTechnician: boolean
  isViewer: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const inactivityTimerRef = useRef<number | undefined>(undefined)
  const inactivityMs = 5 * 60 * 1000

  useEffect(() => {
    const token = localStorage.getItem('auth_token')
    if (!token) {
      setLoading(false)
      return
    }
    ;(async () => {
      try {
        const data = await apiFetch('/auth/me', { headers: { Authorization: `Bearer ${token}` } })
        setUser((data as any).user)
      } catch {
        localStorage.removeItem('auth_token')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const signIn = async (email: string, password: string) => {
    const emailNorm = String(email || '').trim().toLowerCase()
    const passwordNorm = String(password || '').trim()
    const data = await apiFetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailNorm, password: passwordNorm }),
    })
    const token = (data as any).token
    const user = (data as any).user
    localStorage.setItem('auth_token', token)
    setUser(user)
    return user as User
  }

  const signOut = async () => {
    localStorage.removeItem('auth_token')
    try { localStorage.setItem('auth_logout', String(Date.now())) } catch {}
    setUser(null)
  }

  const isAdmin = user?.role === 'admin'
  const isTechnician = user?.role === 'technician' || isAdmin
  const isViewer = user?.role === 'viewer'

  const value = {
    user,
    loading,
    signIn,
    signOut,
    isAdmin,
    isTechnician,
    isViewer,
  }

  useEffect(() => {
    if (!user || user.role === 'viewer') {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current)
        inactivityTimerRef.current = undefined
      }
      return
    }
    const resetTimer = () => {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current)
      inactivityTimerRef.current = window.setTimeout(() => {
        signOut()
      }, inactivityMs)
    }
    const handler = () => resetTimer()
    const events = ['mousemove','mousedown','keydown','scroll','touchstart','wheel','click']
    events.forEach((ev) => window.addEventListener(ev, handler, { passive: true } as any))
    resetTimer()
    return () => {
      events.forEach((ev) => window.removeEventListener(ev, handler as any))
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current)
      inactivityTimerRef.current = undefined
    }
  }, [user])

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'auth_logout') signOut()
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
