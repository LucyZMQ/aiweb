import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  LoaderCircle,
  PenLine,
  Search,
  Trash2,
} from 'lucide-react'
import { api } from '../lib/api'
import type { PostPage, PostStatus, PostSummary } from '../lib/types'
import { compact, cx, formatDate } from '../lib/format'
import { useToast } from '../components/Toast'

const tabs: Array<{ value: '' | PostStatus; label: string }> = [
  { value: '', label: '全部' },
  { value: 'PUBLISHED', label: '已发布' },
  { value: 'DRAFT', label: '草稿' },
]

export function Posts() {
  const navigate = useNavigate()
  const { notify } = useToast()
  const [result, setResult] = useState<PostPage | null>(null)
  const [status, setStatus] = useState<'' | PostStatus>('')
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<PostSummary | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebounced(query.trim())
      setPage(0)
    }, 300)
    return () => window.clearTimeout(timer)
  }, [query])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    api
      .adminPosts({ status: status || undefined, q: debounced || undefined, page, size: 10 })
      .then((data) => {
        if (!cancelled) setResult(data)
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
  }, [status, debounced, page])

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.deletePost(deleteTarget.id)
      notify('文章已删除')
      setDeleteTarget(null)
      setResult((current) =>
        current
          ? { ...current, items: current.items.filter((item) => item.id !== deleteTarget.id), total: current.total - 1 }
          : current,
      )
    } catch (err) {
      notify((err as Error).message, 'error')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div>
      <div className="admin-page-head">
        <div>
          <span className="eyebrow"><i /> CONTENT</span>
          <h1>文章</h1>
          <p>写下、修改，然后选择什么时候让它被看见。</p>
        </div>
        <button type="button" className="btn btn-dark" onClick={() => navigate('/admin/posts/new')}>
          <PenLine size={16} />
          新建文章
        </button>
      </div>

      <div className="panel posts-panel">
        <div className="posts-toolbar">
          <div className="segmented">
            {tabs.map((tab) => (
              <button
                key={tab.label}
                type="button"
                className={cx(status === tab.value && 'is-active')}
                onClick={() => {
                  setStatus(tab.value)
                  setPage(0)
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <label className="search-field admin-search">
            <Search size={16} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索标题或 slug"
            />
          </label>
        </div>

        {error && <div className="inline-error">{error}</div>}

        <div className="posts-table">
          <div className="posts-row posts-head">
            <span>文章</span>
            <span>状态</span>
            <span>阅读</span>
            <span>更新时间</span>
            <span>操作</span>
          </div>
          {loading ? (
            Array.from({ length: 5 }).map((_, index) => (
              <div className="posts-row" key={index}>
                <div className="skeleton skeleton-line title" />
                <div className="skeleton skeleton-line short" />
                <div className="skeleton skeleton-line short" />
                <div className="skeleton skeleton-line short" />
                <div className="skeleton skeleton-line short" />
              </div>
            ))
          ) : result && result.items.length > 0 ? (
            result.items.map((post) => (
              <div className="posts-row" key={post.id}>
                <div className="post-cell">
                  <Link to={`/admin/posts/${post.id}/edit`} className="post-cell-title">
                    {post.title}
                  </Link>
                  <small>/{post.slug} · {formatDate(post.publishedAt || post.updatedAt)}</small>
                </div>
                <span className={`status-pill ${post.status.toLowerCase()}`}>
                  {post.status === 'PUBLISHED' ? '已发布' : '草稿'}
                </span>
                <span className="mono">{compact(post.viewCount)}</span>
                <span className="posts-time">{formatDate(post.updatedAt)}</span>
                <div className="row-actions">
                  {post.status === 'PUBLISHED' && (
                    <a
                      href={`/posts/${post.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="icon-button"
                      title="查看"
                    >
                      <ExternalLink size={16} />
                    </a>
                  )}
                  <Link to={`/admin/posts/${post.id}/edit`} className="icon-button" title="编辑">
                    <PenLine size={16} />
                  </Link>
                  <button
                    type="button"
                    className="icon-button danger"
                    title="删除"
                    onClick={() => setDeleteTarget(post)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="table-empty">
              <span>∅</span>
              <p>{debounced || status ? '没有符合条件的文章。' : '还没有文章，写下第一篇吧。'}</p>
            </div>
          )}
        </div>

        {result && result.total > 0 && (
          <div className="table-pagination">
            <span>共 {result.total} 篇 · 第 {result.page + 1} / {Math.max(1, result.totalPages)} 页</span>
            <div>
              <button
                type="button"
                className="icon-button"
                disabled={page <= 0}
                onClick={() => setPage((value) => Math.max(0, value - 1))}
                title="上一页"
              >
                <ArrowLeft size={16} />
              </button>
              <button
                type="button"
                className="icon-button"
                disabled={page + 1 >= result.totalPages}
                onClick={() => setPage((value) => value + 1)}
                title="下一页"
              >
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {deleteTarget && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="确认删除文章">
          <div className="modal">
            <span className="modal-kicker">DELETE</span>
            <h2>删除这篇文章？</h2>
            <p>
              「{deleteTarget.title}」将从资料库中移除，这个动作无法撤销。
            </p>
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setDeleteTarget(null)}>
                取消
              </button>
              <button type="button" className="btn btn-danger" onClick={confirmDelete} disabled={deleting}>
                {deleting && <LoaderCircle className="spin" size={16} />}
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
