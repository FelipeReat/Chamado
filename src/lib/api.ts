// Simple API client that attaches auth token
export async function apiFetch(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem('auth_token')
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as any || {}),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const API_BASE = `${window.location.protocol}//${window.location.hostname}:5006`
  const res = await fetch(`${API_BASE}/api${path.startsWith('/') ? '' : '/'}${path}`, {
    ...options,
    headers,
  })
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