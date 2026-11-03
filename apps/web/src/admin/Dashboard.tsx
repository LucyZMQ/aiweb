import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  ArrowUpRight,
  Eye,
  FileText,
  Images,
  PenLine,
  TrendingUp,
  Users,
} from 'lucide-react'
import type { AnalyticsOverview, PostSummary } from '../lib/types'
import { api } from '../lib/api'
import { compact, formatDate, formatLongDate, relativeTime } from '../lib/format'
import { useAuth } from '../lib/auth'

function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 6) return '夜深了'
  if (hour < 11) return '早上好'
  if (hour < 14) return '中午好'
  if (hour < 18) return '下午好'
  return '晚上好'
}

function percentChange(current: number, previous: number): string {
  if (previous === 0) return current > 0 ? '+100%' : '持平'
  const value = ((current - previous) / previous) * 100
  return `${value >= 0 ? '+' : ''}${value.toFixed(0)}%`
}

function TrendChart({ data }: { data: AnalyticsOverview }) {
  const width = 860
  const height = 250
  const padding = { top: 18, right: 18, bottom: 30, left: 38 }
  const innerW = width - padding.left - padding.right
  const innerH = height - padding.top - padding.bottom
  const series = data.series
  const max = Math.max(4, ...series.map((point) => Math.max(point.pv, point.uv)))
  const stepX = series.length > 1 ? innerW / (series.length - 1) : innerW

  const point = (index: number, value: number) => ({
    x: padding.left + index * stepX,
    y: padding.top + innerH - (value / max) * innerH,
  })

  const line = (key: 'pv' | 'uv') =>
    series
      .map((item, index) => {
        const { x, y } = point(index, item[key])
        return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
      })
      .join(' ')

  const area = `${line('pv')} L${padding.left + (series.length - 1) * stepX},${padding.top + innerH} L${padding.left},${padding.top + innerH} Z`
  const labelEvery = Math.max(1, Math.ceil(series.length / 6))

  return (
    <div className="chart-wrap">
      <div className="chart-legend">
        <span><i className="legend-pv" /> 浏览量 PV</span>
        <span><i className="legend-uv" /> 访客 UV</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="trend-chart" role="img" aria-label="PV 与 UV 趋势图">
        <defs>
          <linearGradient id="pvArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2f5d50" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#2f5d50" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = padding.top + innerH * ratio
          const value = Math.round(max * (1 - ratio))
          return (
            <g key={ratio}>
              <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} className="chart-grid" />
              <text x={padding.left - 10} y={y + 3} className="chart-axis" textAnchor="end">{value}</text>
            </g>
          )
        })}
        <path d={area} fill="url(#pvArea)" />
        <path d={line('pv')} className="chart-line pv" />
        <path d={line('uv')} className="chart-line uv" />
        {series.map((item, index) => {
          const pv = point(index, item.pv)
          const uv = point(index, item.uv)
          const showLabel = index % labelEvery === 0 || index === series.length - 1
          return (
            <g key={item.date}>
              {showLabel && (
                <text x={pv.x} y={height - 8} className="chart-axis" textAnchor="middle">
                  {item.date.slice(5).replace('-', '.')}
                </text>
              )}
              <circle cx={pv.x} cy={pv.y} r="3" className="chart-dot pv">
                <title>{item.date} · PV {item.pv} · UV {item.uv}</title>
              </circle>
              <circle cx={uv.x} cy={uv.y} r="2.5" className="chart-dot uv">
                <title>{item.date} · UV {item.uv}</title>
              </circle>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

export function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null)
  const [posts, setPosts] = useState<PostSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    Promise.all([api.analytics(14), api.adminPosts({ page: 0, size: 5 })])
      .then(([analytics, postPage]) => {
        if (cancelled) return
        setOverview(analytics)
        setPosts(postPage.items)
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const firstHalf = overview?.series.slice(0, 7).reduce((sum, item) => sum + item.pv, 0) ?? 0
  const secondHalf = overview?.series.slice(7).reduce((sum, item) => sum + item.pv, 0) ?? 0
  const maxPage = Math.max(1, ...(overview?.topPages.map((page) => page.pv) ?? [1]))

  return (
    <div className="dashboard">
      <div className="admin-page-head">
        <div>
          <span className="eyebrow"><i /> OVERVIEW</span>
          <h1>{greeting()}，{user?.displayName}</h1>
          <p>{formatLongDate(new Date().toISOString())} · 今天也写一点值得留下的东西。</p>
        </div>
        <button type="button" className="btn btn-dark" onClick={() => navigate('/admin/posts/new')}>
          <PenLine size={16} />
          写新文章
        </button>
      </div>

      {error && <div className="inline-error">{error}</div>}

      <div className="stat-grid">
        <div className="stat-card">
          <span className="stat-icon"><Eye size={18} /></span>
          <span className="stat-label">近 14 天浏览量</span>
          <strong>{loading ? '—' : compact(overview?.pageViews ?? 0)}</strong>
          <span className="stat-note up">
            <TrendingUp size={13} />
            后 7 天较前 7 天 {percentChange(secondHalf, firstHalf)}
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-icon"><Users size={18} /></span>
          <span className="stat-label">独立访客</span>
          <strong>{loading ? '—' : compact(overview?.uniqueVisitors ?? 0)}</strong>
          <span className="stat-note">按匿名 visitorId 去重</span>
        </div>
        <div className="stat-card">
          <span className="stat-icon"><TrendingUp size={18} /></span>
          <span className="stat-label">日均浏览</span>
          <strong>{loading ? '—' : overview?.avgPerDay ?? 0}</strong>
          <span className="stat-note">PV / 统计天数</span>
        </div>
        <div className="stat-card accent">
          <span className="stat-icon"><FileText size={18} /></span>
          <span className="stat-label">最近更新</span>
          <strong className="stat-date">{posts[0] ? formatDate(posts[0].updatedAt) : '—'}</strong>
          <span className="stat-note">{posts[0]?.title ?? '还没有文章'}</span>
        </div>
      </div>

      <div className="dashboard-grid">
        <section className="panel chart-panel">
          <div className="panel-head">
            <div>
              <h2>访问趋势</h2>
              <p>第一方埋点，不含写作台流量</p>
            </div>
            <span className="panel-badge">近 14 天</span>
          </div>
          {overview ? <TrendChart data={overview} /> : <div className="chart-placeholder skeleton" />}
          <div className="chart-foot">
            <span>数据来自 <code>/api/analytics/collect</code></span>
            <span>IP 仅以加盐哈希保存</span>
          </div>
        </section>

        <aside className="dashboard-side">
          <section className="panel quick-panel">
            <div className="panel-head">
              <h2>快捷动作</h2>
            </div>
            <Link to="/admin/posts/new" className="quick-action">
              <span><PenLine size={18} /></span>
              <div><strong>开始写作</strong><small>新建一篇草稿</small></div>
              <ArrowRight size={16} />
            </Link>
            <Link to="/admin/media" className="quick-action">
              <span><Images size={18} /></span>
              <div><strong>上传素材</strong><small>封面与插图</small></div>
              <ArrowRight size={16} />
            </Link>
            <a href="/" target="_blank" rel="noreferrer" className="quick-action">
              <span><ArrowUpRight size={18} /></span>
              <div><strong>查看站点</strong><small>打开公开首页</small></div>
              <ArrowRight size={16} />
            </a>
          </section>

          <section className="panel top-pages-panel">
            <div className="panel-head">
              <h2>热门页面</h2>
              <span className="panel-badge">PV</span>
            </div>
            {overview && overview.topPages.length > 0 ? (
              <div className="top-pages">
                {overview.topPages.slice(0, 5).map((page) => (
                  <div key={page.path} className="top-page">
                    <div>
                      <span>{page.path === '/' ? '首页' : page.path}</span>
                      <strong>{page.pv}</strong>
                    </div>
                    <div className="bar"><i style={{ width: `${Math.max(4, (page.pv / maxPage) * 100)}%` }} /></div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="panel-empty">还没有访问数据。打开一次博客首页就会开始记录。</p>
            )}
          </section>
        </aside>
      </div>

      <section className="panel recent-panel">
        <div className="panel-head">
          <div>
            <h2>最近编辑</h2>
            <p>按更新时间排序</p>
          </div>
          <Link to="/admin/posts" className="text-link">全部文章 <ArrowRight size={14} /></Link>
        </div>
        <div className="recent-table">
          <div className="recent-row recent-head">
            <span>标题</span><span>状态</span><span>阅读</span><span>更新时间</span><span />
          </div>
          {posts.map((post) => (
            <div className="recent-row" key={post.id}>
              <div className="recent-title">
                <strong>{post.title}</strong>
                <small>/{post.slug}</small>
              </div>
              <span className={`status-pill ${post.status.toLowerCase()}`}>
                {post.status === 'PUBLISHED' ? '已发布' : '草稿'}
              </span>
              <span className="mono">{compact(post.viewCount)}</span>
              <span className="recent-time">{relativeTime(post.updatedAt)}</span>
              <Link to={`/admin/posts/${post.id}/edit`} className="table-link">编辑</Link>
            </div>
          ))}
          {!loading && posts.length === 0 && <p className="panel-empty">还没有文章，去写第一篇吧。</p>}
        </div>
      </section>
    </div>
  )
}
