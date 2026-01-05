import { createContext, useContext, useEffect, useRef, useState } from 'react'

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
    fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('Sessão inválida')
        const data = await res.json()
        setUser(data.user)
      })
      .catch(() => {
        localStorage.removeItem('auth_token')
      })
      .finally(() => setLoading(false))
  }, [])

  const signIn = async (email: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    if (!res.ok) throw new Error('Login falhou')
    const data = await res.json()
    localStorage.setItem('auth_token', data.token)
    setUser(data.user)
    return data.user
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