const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'
const TOKEN_KEY = 'benmaoyaya_access_token'

export function getToken() {
  return sessionStorage.getItem(TOKEN_KEY) || ''
}

export function setToken(token: string) {
  sessionStorage.setItem(TOKEN_KEY, token)
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  token = getToken(),
): Promise<T> {
  const headers = new Headers(options.headers)
  if (!(options.body instanceof FormData)) headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers })
  const contentType = response.headers.get('content-type') || ''
  const payload = contentType.includes('application/json') ? await response.json() : await response.text()
  if (!response.ok) {
    const message =
      typeof payload === 'object' && payload && 'message' in payload
        ? String(Array.isArray(payload.message) ? payload.message.join('；') : payload.message)
        : '请求失败'
    throw new Error(message)
  }
  return payload as T
}

export async function demoLogin(role: 'student' | 'mentor' | 'parent' | 'admin') {
  return apiRequest<{ accessToken: string }>('/auth/demo-login', {
    method: 'POST',
    body: JSON.stringify({ role }),
  }, '')
}
