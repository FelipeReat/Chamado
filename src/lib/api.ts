export async function apiFetch(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem('auth_token')
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as any || {}),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const isDev = !!((import.meta as any).env?.DEV)
  const envBase = (import.meta as any).env?.VITE_API_BASE_URL || ''
  const API_BASE = isDev ? '' : envBase

  const url = `${API_BASE}/api${path.startsWith('/') ? '' : '/'}${path}`
  let res: Response
  try {
    res = await fetch(url, { ...options, headers })
  } catch (err) {
    if (isDev) {
      res = await fetch(`http://localhost:3000/api${path.startsWith('/') ? '' : '/'}${path}`, { ...options, headers })
    } else {
      throw err
    }
  }
  if (!res.ok) {
    const ct = res.headers.get('content-type') || ''
    try {
      if (ct.includes('application/json')) {
        const body = await res.json()
        const msg = (body && (body.error || body.message)) ? String(body.error || body.message) : ''
        throw new Error(`API ${res.status}: ${msg || res.statusText}`)
      }
    } catch {}
    const text = await res.text().catch(() => '')
    throw new Error(`API ${res.status}: ${text || res.statusText || 'API error'}`)
  }
  return res.json()
}
