import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  LoaderCircle,
  Search,
  Sparkles,
  X,
} from 'lucide-react'
import { api } from '../lib/api'
import type { PostSummary, SiteStats } from '../lib/types'
import { compact, formatDate, formatLongDate, cx } from '../lib/format'
import { Header } from '../components/Header'
import { Footer } from '../components/Footer'
import { PostCard, PostCardSkeleton } from '../components/PostCard'

const PAGE_SIZE = 6

export function Home() {
  const [posts, setPosts] = useState<PostSummary[]>([])
  const [stats, setStats] = useState<SiteStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [activeTag, setActiveTag] = useState('')
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)

  const hasFilter = Boolean(activeTag || debouncedQuery)
  const featured = !hasFilter ? posts[0] : undefined
  const rest = !hasFilter ? posts.slice(1) : posts

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 320)
    return () => window.clearTimeout(timer)
  }, [query])

  useEffect(() => {
    api.stats().then(setStats).catch(() => undefined)
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    api
      .posts({ tag: activeTag || undefined, q: debouncedQuery || undefined, page: 0, size: PAGE_SIZE })
      .then((result) => {
        if (cancelled) return
        setPosts(result.items)
        setTotal(result.total)
        setTotalPages(result.totalPages)
        setPage(0)
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
  }, [activeTag, debouncedQuery])

  async function loadMore() {
    if (loadingMore || page + 1 >= totalPages) return
    setLoadingMore(true)
    try {
      const next = await api.posts({
        tag: activeTag || undefined,
        q: debouncedQuery || undefined,
        page: page + 1,
        size: PAGE_SIZE,
      })
      setPosts((current) => [...current, ...next.items])
      setPage(next.page)
      setTotalPages(next.totalPages)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoadingMore(false)
    }
  }

  return (
    <div className="site">
      <Header />
      <main>
        <section className="hero shell">
          <div className="hero-copy">
            <span className="eyebrow reveal-1">
              <i />
              FIELD NOTES · 独立写作者
            </span>
            <h1 className="reveal-2">
              在技术的海边，
              <br />
              <em>留下一些坐标。</em>
            </h1>
            <p className="hero-lead reveal-3">
              关于工程、设计与安静技术的个人笔记。记录那些让系统变简单、
              让产品变清晰的瞬间。
            </p>
            <div className="hero-actions reveal-4">
              <a href="#articles" className="btn btn-dark">
                开始阅读
                <ArrowDown size={16} />
              </a>
              <Link to="/about" className="text-link">
                关于墨屿
                <ArrowUpRight size={15} />
              </Link>
            </div>
            <div className="hero-stats reveal-4">
              <div>
                <strong>{stats?.posts ?? '—'}</strong>
                <span>篇长文</span>
              </div>
              <div>
                <strong>{stats ? compact(stats.views) : '—'}</strong>
                <span>次阅读</span>
              </div>
              <div>
                <strong>{stats?.lastUpdated ? formatDate(stats.lastUpdated).slice(5) : '—'}</strong>
                <span>最近更新</span>
              </div>
            </div>
          </div>

          <div className="hero-art reveal-3">
            <div className="art-card">
              <svg className="art-contours" viewBox="0 0 520 640" aria-hidden="true">
                <defs>
                  <linearGradient id="contourFade" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#dce9bb" stopOpacity="0.85" />
                    <stop offset="1" stopColor="#dce9bb" stopOpacity="0.05" />
                  </linearGradient>
                </defs>
                <g fill="none" stroke="url(#contourFade)" strokeWidth="1.1">
                  <path d="M-40 480C80 360 160 470 250 350s180-60 310-190" />
                  <path d="M-40 505C85 385 170 495 260 375s185-60 315-190" />
                  <path d="M-40 530C90 410 180 520 270 400s190-60 320-190" />
                  <path d="M-40 555C95 435 190 545 280 425s195-60 325-190" />
                  <path d="M-40 580C100 460 200 570 290 450s200-60 330-190" />
                  <path d="M-40 605C105 485 210 595 300 475s205-60 335-190" />
                  <path d="M-40 630C110 510 220 620 310 500s210-60 340-190" />
                  <path d="M-40 655C115 535 230 645 320 525s215-60 345-190" />
                </g>
                <circle cx="372" cy="210" r="92" fill="none" stroke="#dce9bb" strokeOpacity="0.35" />
                <circle cx="372" cy="210" r="4" fill="#dce9bb" />
                <path d="M372 210L470 130" stroke="#dce9bb" strokeOpacity="0.5" strokeDasharray="3 6" />
              </svg>
              <div className="art-topline">
                <span>ISSUE 001</span>
                <span>31°14′N / 121°29′E</span>
              </div>
              <div className="art-middle">
                <span className="art-index">01</span>
                <p>
                  “把复杂留给系统，
                  <br />
                  把安静留给自己。”
                </p>
              </div>
              <div className="art-bottomline">
                <span>ENGINEERING / DESIGN / LIFE</span>
                <span className="art-seal">墨</span>
              </div>
            </div>
            {featured && (
              <Link to={`/posts/${featured.slug}`} className="floating-note">
                <span>
                  <Sparkles size={13} />
                  正在被阅读
                </span>
                <strong>{featured.title}</strong>
                <small>
                  阅读这篇文章 <ArrowRight size={13} />
                </small>
              </Link>
            )}
          </div>
        </section>

        <div className="ticker" aria-hidden="true">
          <div className="ticker-track">
            <span>慢系统</span><i />
            <span>清晰边界</span><i />
            <span>可回滚发布</span><i />
            <span>可观察性</span><i />
            <span>克制的设计</span><i />
            <span>慢系统</span><i />
            <span>清晰边界</span><i />
            <span>可回滚发布</span><i />
            <span>可观察性</span><i />
            <span>克制的设计</span><i />
          </div>
        </div>

        <section className="articles-section shell" id="articles">
          <div className="section-head">
            <div>
              <span className="eyebrow">
                <i />
                THE ARCHIVE
              </span>
              <h2>最近的文字</h2>
            </div>
            <div className="archive-count">
              <span>{total}</span>
              篇已发布
            </div>
          </div>

          <div className="filter-bar">
            <div className="tag-filter" role="group" aria-label="按标签筛选">
              <button
                type="button"
                className={cx('filter-chip', !activeTag && 'is-active')}
                onClick={() => setActiveTag('')}
              >
                全部
              </button>
              {stats?.tags.slice(0, 8).map((tag) => (
                <button
                  type="button"
                  key={tag}
                  className={cx('filter-chip', activeTag === tag && 'is-active')}
                  onClick={() => setActiveTag(activeTag === tag ? '' : tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
            <label className="search-field">
              <Search size={16} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜索文章…"
                aria-label="搜索文章"
              />
              {query && (
                <button type="button" onClick={() => setQuery('')} aria-label="清空搜索">
                  <X size={14} />
                </button>
              )}
            </label>
          </div>

          {error && !loading && (
            <div className="inline-error">
              {error}
              <button type="button" onClick={() => window.location.reload()}>
                刷新页面
              </button>
            </div>
          )}

          {loading ? (
            <div className="post-grid">
              {Array.from({ length: 6 }).map((_, index) => (
                <PostCardSkeleton key={index} />
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="empty-archive">
              <span>∅</span>
              <h3>没有找到相符的文字</h3>
              <p>换一个关键词，或者回到全部文章。</p>
              <button type="button" className="btn btn-ghost" onClick={() => {
                setQuery('')
                setActiveTag('')
              }}>
                清除筛选
              </button>
            </div>
          ) : (
            <>
              {featured && (
                <div className="featured-grid">
                  <PostCard post={featured} featured />
                  <aside className="featured-aside">
                    <span className="eyebrow">
                      <i />
                      EDITOR'S NOTE
                    </span>
                    <p>
                      这里收录的是我最近想清楚的一些事。不是教程，也不是答案，
                      更像是在复杂系统里留下的一张张手绘地图。
                    </p>
                    <div className="aside-sign">— 墨屿主人</div>
                    <div className="aside-rule" />
                    <small>更新于 {featured.publishedAt ? formatLongDate(featured.publishedAt) : '最近'}</small>
                  </aside>
                </div>
              )}
              <div className={cx('post-grid', hasFilter && 'is-filtered')}>
                {rest.map((post) => (
                  <PostCard post={post} key={post.id} />
                ))}
              </div>
              {page + 1 < totalPages && (
                <div className="load-more-wrap">
                  <button type="button" className="btn btn-ghost load-more" onClick={loadMore} disabled={loadingMore}>
                    {loadingMore ? <LoaderCircle className="spin" size={16} /> : <ArrowDown size={16} />}
                    {loadingMore ? '正在加载' : '继续翻阅'}
                  </button>
                  <span>
                    {posts.length} / {total}
                  </span>
                </div>
              )}
            </>
          )}
        </section>

        <section className="manifesto">
          <div className="shell manifesto-inner">
            <div className="manifesto-lead">
              <span className="eyebrow light">
                <i />
                WHY THIS SITE
              </span>
              <h2>
                一个可以慢一点
                <br />
                阅读的地方。
              </h2>
              <p>
                不追热点，不堆信息。只把那些经过实践、值得复述的经验写下来。
                每一篇都尽量完整，而不是碎片。
              </p>
              <Link to="/about" className="text-link light">
                这个站是怎么搭的
                <ArrowUpRight size={15} />
              </Link>
            </div>
            <div className="principles">
              <div>
                <span>01</span>
                <h3>系统要小</h3>
                <p>每条边界都清楚，下一次修改只发生在一个地方。</p>
              </div>
              <div>
                <span>02</span>
                <h3>发布要静</h3>
                <p>提交、测试、部署、通知。没有手工，也没有意外。</p>
              </div>
              <div>
                <span>03</span>
                <h3>数据要真</h3>
                <p>只收集需要的数字，并且知道它们从哪里来。</p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
