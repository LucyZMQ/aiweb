export type PostStatus = 'DRAFT' | 'PUBLISHED'

export interface PostSummary {
  id: string
  slug: string
  title: string
  excerpt: string
  coverUrl?: string
  tags: string[]
  status: PostStatus
  publishedAt?: string
  updatedAt: string
  viewCount: number
  readingMinutes: number
}

export interface PostDetail extends PostSummary {
  content: string
  createdAt: string
}

export interface PostPage {
  items: PostSummary[]
  page: number
  size: number
  total: number
  totalPages: number
}

export interface SiteStats {
  posts: number
  views: number
  lastUpdated?: string
  tags: string[]
}

export interface User {
  id: string
  email: string
  displayName: string
  role: 'ADMIN' | 'READER'
}

export interface LoginResponse {
  token: string
  expiresAt: string
  user: User
}

export interface CaptchaPayload {
  lotNumber: string
  captchaOutput: string
  passToken: string
  genTime: string
}

export interface CaptchaConfig {
  enabled: boolean
  captchaId?: string
}

export interface EmailCodeResponse {
  message: string
  expiresInSeconds: number
  devCode?: string
}

export interface DailyPoint {
  date: string
  pv: number
  uv: number
}

export interface TopPage {
  path: string
  pv: number
}

export interface AnalyticsOverview {
  days: number
  pageViews: number
  uniqueVisitors: number
  avgPerDay: number
  series: DailyPoint[]
  topPages: TopPage[]
}

export interface MediaItem {
  id: string
  url: string
  objectKey: string
  originalName: string
  contentType: string
  sizeBytes: number
  createdAt: string
}

export interface MediaList {
  items: MediaItem[]
  provider: 'local' | 'cos'
}

export interface PostInput {
  title: string
  slug: string
  excerpt: string
  content: string
  coverUrl: string
  tags: string[]
  status: PostStatus
}
