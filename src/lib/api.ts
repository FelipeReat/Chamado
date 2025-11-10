// Simple API client that attaches auth token
export async function apiFetch(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem('auth_token')
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as any || {}),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`/api${path.startsWith('/') ? '' : '/'}${path}`, {
    ...options,
    headers,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || 'API error')
  }
  return res.json()
}