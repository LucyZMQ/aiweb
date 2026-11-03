import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowUpRight, Check, Clock, Eye, Link2 } from 'lucide-react'
import { api } from '../lib/api'
import type { PostDetail } from '../lib/types'
import { formatLongDate } from '../lib/format'
import { Header } from '../components/Header'
import { Footer } from '../components/Footer'
import { Markdown, extractHeadings } from '../components/Markdown'
import { ErrorState } from '../components/ErrorState'
import { Cover } from '../components/PostCard'

export function Post() {
  const { slug = '' } = useParams()
  const [post, setPost] = useState<PostDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const [progress, setProgress] = useState(0)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    api
      .post(slug)
      .then((result) => {
        if (cancelled) return
        setPost(result)
        document.title = `${result.title} · 墨屿 MOYU`
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
      document.title = '墨屿 MOYU · 在技术的海边留下坐标'
    }
  }, [slug, retry])

  useEffect(() => {
    const onScroll = () => {
      const height = document.documentElement.scrollHeight - window.innerHeight
      setProgress(height > 0 ? Math.min(1, window.scrollY / height) : 0)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [post])

  const headings = useMemo(() => (post ? extractHeadings(post.content) : []), [post])

  async function share() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2200)
    } catch {
      // 剪贴板不可用时忽略
    }
  }

  if (loading) {
    return (
      <div className="site">
        <Header />
        <main className="article-loading shell">
          <div className="skeleton skeleton-line short" />
          <div className="skeleton skeleton-line title" />
          <div className="skeleton skeleton-line medium" />
          <div className="skeleton skeleton-cover" />
        </main>
        <Footer />
      </div>
    )
  }

  if (error || !post) {
    return (
      <div className="site">
        <Header />
        <main>
          <ErrorState
            title="这篇文章不在岛上"
            message={error || '它可能被移走了，或者还藏在草稿箱里。'}
            onRetry={() => setRetry((value) => value + 1)}
          />
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="site">
      <div className="reading-progress" style={{ transform: `scaleX(${progress})` }} />
      <Header />
      <main>
        <article className="article">
          <header className="article-header shell">
            <Link to="/#articles" className="article-back">
              <ArrowLeft size={15} />
              返回文章
            </Link>
            <div className="article-tags">
              {post.tags.map((tag) => (
                <span className="tag" key={tag}>
                  {tag}
                </span>
              ))}
            </div>
            <h1>{post.title}</h1>
            <p className="article-deck">{post.excerpt}</p>
            <div className="article-meta">
              <span>{formatLongDate(post.publishedAt)}</span>
              <span className="meta-dot" />
              <span>
                <Clock size={14} />
                {post.readingMinutes} 分钟阅读
              </span>
              <span className="meta-dot" />
              <span>
                <Eye size={14} />
                {post.viewCount} 次阅读
              </span>
            </div>
          </header>

          <div className="article-cover shell">
            <Cover src={post.coverUrl} title={post.title} />
          </div>

          <div className="article-layout shell">
            <div className="article-body">
              <Markdown content={post.content} />
              <div className="article-end">
                <span>— 完 —</span>
                <div className="article-end-actions">
                  <button type="button" className="btn btn-ghost" onClick={share}>
                    {copied ? <Check size={16} /> : <Link2 size={16} />}
                    {copied ? '链接已复制' : '复制链接'}
                  </button>
                  <Link to="/#articles" className="btn btn-dark">
                    继续阅读
                    <ArrowUpRight size={16} />
                  </Link>
                </div>
              </div>
            </div>

            <aside className="article-aside">
              {headings.length > 0 && (
                <div className="toc">
                  <span className="eyebrow">
                    <i />
                    ON THIS PAGE
                  </span>
                  <nav>
                    {headings.map((heading) => (
                      <a
                        key={`${heading.id}-${heading.text}`}
                        href={`#${heading.id}`}
                        className={heading.level === 3 ? 'toc-sub' : ''}
                      >
                        {heading.text}
                      </a>
                    ))}
                  </nav>
                </div>
              )}
              <div className="aside-card">
                <span className="eyebrow light">
                  <i />
                  MOYU NOTES
                </span>
                <p>如果这篇文章对你有帮助，欢迎把它分享给同样在构建东西的人。</p>
                <span className="aside-card-mark">墨</span>
              </div>
            </aside>
          </div>
        </article>
      </main>
      <Footer />
    </div>
  )
}
