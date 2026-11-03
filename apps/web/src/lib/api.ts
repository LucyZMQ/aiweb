import type {
  AnalyticsOverview,
  CaptchaConfig,
  CaptchaPayload,
  EmailCodeResponse,
  LoginResponse,
  MediaItem,
  MediaList,
  PostDetail,
  PostInput,
  PostPage,
  SiteStats,
  User,
} from './types'

export const TOKEN_KEY = 'moyu_token'

const rawBase = import.meta.env.VITE_API_BASE_URL || ''
const API_BASE = rawBase.replace(/\/+$/, '')

export class ApiError extends Error {
  status: number
  fields?: Record<string, string>

  constructor(message: string, status: number, fields?: Record<string, string>) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fields = fields
  }
}

function authHeader(): Record<string, string> {
  const token = localStorage.getItem(TOKEN_KEY)
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        ...authHeader(),
        ...(options.headers || {}),
      },
    })
  } catch {
    throw new ApiError('网络连接失败，请检查服务是否启动', 0)
  }

  if (response.status === 401 && !path.includes('/auth/login') && !path.includes('/auth/email-code')) {
    localStorage.removeItem(TOKEN_KEY)
    window.dispatchEvent(new CustomEvent('moyu:unauthorized'))
  }

  if (!response.ok) {
    let message = `请求失败（${response.status}）`
    let fields: Record<string, string> | undefined
    try {
      const body = await response.json()
      message = body.message || message
      fields = body.fields
    } catch {
      // 非 JSON 错误响应
    }
    throw new ApiError(message, response.status, fields)
  }

  if (response.status === 204) {
    return undefined as T
  }
  return (await response.json()) as T
}

function qs(params: Record<string, string | number | undefined | null>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && String(value).length > 0) {
      search.set(key, String(value))
    }
  }
  const result = search.toString()
  return result ? `?${result}` : ''
}

export const api = {
  captchaConfig: () => request<CaptchaConfig>('/api/auth/captcha/config'),

  requestEmailCode: (email: string, captcha: CaptchaPayload | null) =>
    request<EmailCodeResponse>('/api/auth/email-code', {
      method: 'POST',
      body: JSON.stringify({ email, captcha }),
    }),

  login: (email: string, code: string) =>
    request<LoginResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    }),

  me: () => request<User>('/api/auth/me'),

  posts: (params: { q?: string; tag?: string; page?: number; size?: number } = {}) =>
    request<PostPage>(`/api/public/posts${qs(params)}`),

  post: (slug: string) => request<PostDetail>(`/api/public/posts/${encodeURIComponent(slug)}`),

  stats: () => request<SiteStats>('/api/public/stats'),

  adminPosts: (params: { status?: string; q?: string; page?: number; size?: number } = {}) =>
    request<PostPage>(`/api/admin/posts${qs(params)}`),

  adminPost: (id: string) => request<PostDetail>(`/api/admin/posts/${id}`),

  createPost: (input: PostInput) =>
    request<PostDetail>('/api/admin/posts', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  updatePost: (id: string, input: PostInput) =>
    request<PostDetail>(`/api/admin/posts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    }),

  deletePost: (id: string) =>
    request<void>(`/api/admin/posts/${id}`, { method: 'DELETE' }),

  analytics: (days = 14) =>
    request<AnalyticsOverview>(`/api/admin/analytics/overview?days=${days}`),

  media: () => request<MediaList>('/api/admin/media'),

  uploadMedia: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return request<MediaItem>('/api/admin/media', { method: 'POST', body: form })
  },

  deleteMedia: (id: string) =>
    request<void>(`/api/admin/media/${id}`, { method: 'DELETE' }),
}

export function trackPageView(path: string): void {
  try {
    const visitorId = getVisitorId()
    const sessionId = getSessionId()
    const body = JSON.stringify({
      path,
      referrer: document.referrer || '',
      visitorId,
      sessionId,
    })
    fetch(`${API_BASE}/api/analytics/collect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => undefined)
  } catch {
    // 埋点失败不影响页面
  }
}

function randomId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `v-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`
}

export function getVisitorId(): string {
  const key = 'moyu_visitor'
  let value = localStorage.getItem(key)
  if (!value) {
    value = randomId()
    localStorage.setItem(key, value)
  }
  return value
}

function getSessionId(): string {
  const key = 'moyu_session'
  let value = sessionStorage.getItem(key)
  if (!value) {
    value = randomId()
    sessionStorage.setItem(key, value)
  }
  return value
}
