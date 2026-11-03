import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  ExternalLink,
  Eye,
  Image as ImageIcon,
  LoaderCircle,
  PenLine,
  Save,
  Send,
  Upload,
  X,
} from 'lucide-react'
import { api, ApiError } from '../lib/api'
import type { PostDetail, PostInput, PostStatus } from '../lib/types'
import { formatDate } from '../lib/format'
import { useToast } from '../components/Toast'
import { Markdown } from '../components/Markdown'
import { cx } from '../lib/format'

const emptyForm: PostInput = {
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  coverUrl: '',
  tags: [],
  status: 'DRAFT',
}

export function Editor() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const { notify } = useToast()
  const fileInput = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState<PostInput>(emptyForm)
  const [post, setPost] = useState<PostDetail | null>(null)
  const [tagDraft, setTagDraft] = useState('')
  const [tab, setTab] = useState<'write' | 'preview'>('write')
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState<PostStatus | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!id) return
    let cancelled = false
    api
      .adminPost(id)
      .then((data) => {
        if (cancelled) return
        setPost(data)
        setForm({
          title: data.title,
          slug: data.slug,
          excerpt: data.excerpt,
          content: data.content,
          coverUrl: data.coverUrl || '',
          tags: data.tags,
          status: data.status,
        })
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
  }, [id])

  function update<K extends keyof PostInput>(key: K, value: PostInput[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function addTag() {
    const value = tagDraft.trim().replace(/^#/, '')
    if (!value || form.tags.includes(value) || form.tags.length >= 5) {
      setTagDraft('')
      return
    }
    update('tags', [...form.tags, value])
    setTagDraft('')
  }

  async function uploadCover(file: File) {
    setUploading(true)
    try {
      const asset = await api.uploadMedia(file)
      update('coverUrl', asset.url)
      notify('封面上传成功')
    } catch (err) {
      notify((err as Error).message, 'error')
    } finally {
      setUploading(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  function validate(): boolean {
    const errors: Record<string, string> = {}
    if (!form.title.trim()) errors.title = '标题不能为空'
    if (!form.excerpt.trim()) errors.excerpt = '摘要不能为空'
    if (!form.content.trim()) errors.content = '正文不能为空'
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) {
      setError('还有必填项没有完成')
      return false
    }
    return true
  }

  async function persist(status: PostStatus, leave = false) {
    if (!validate() || saving) return
    setSaving(status)
    setError('')
    try {
      const payload: PostInput = { ...form, status }
      const saved = isEdit && id ? await api.updatePost(id, payload) : await api.createPost(payload)
      setPost(saved)
      setForm((current) => ({ ...current, slug: saved.slug, status: saved.status }))
      notify(status === 'PUBLISHED' ? '文章已发布' : '草稿已保存')
      if (!isEdit) {
        navigate(`/admin/posts/${saved.id}/edit`, { replace: true })
      } else if (leave) {
        navigate('/admin/posts')
      }
    } catch (err) {
      if (err instanceof ApiError && err.fields) setFieldErrors(err.fields)
      setError((err as Error).message)
    } finally {
      setSaving(null)
    }
  }

  if (loading) {
    return (
      <div className="admin-loading">
        <span className="spinner" />
        <p>正在打开文章…</p>
      </div>
    )
  }

  return (
    <div>
      <div className="editor-top">
        <button type="button" className="back-link" onClick={() => navigate('/admin/posts')}>
          <ArrowLeft size={15} />
          返回文章列表
        </button>
        <div className="editor-top-actions">
          {post?.status === 'PUBLISHED' && (
            <a href={`/posts/${post.slug}`} target="_blank" rel="noreferrer" className="btn btn-ghost">
              <ExternalLink size={15} />
              预览
            </a>
          )}
          <button type="button" className="btn btn-ghost" onClick={() => persist('DRAFT')} disabled={Boolean(saving)}>
            {saving === 'DRAFT' ? <LoaderCircle className="spin" size={16} /> : <Save size={16} />}
            保存草稿
          </button>
          <button type="button" className="btn btn-dark" onClick={() => persist('PUBLISHED')} disabled={Boolean(saving)}>
            {saving === 'PUBLISHED' ? <LoaderCircle className="spin" size={16} /> : <Send size={16} />}
            {post?.status === 'PUBLISHED' ? '更新发布' : '发布文章'}
          </button>
        </div>
      </div>

      {error && (
        <div className="inline-error editor-error">
          {error}
          <button type="button" onClick={() => setError('')}><X size={14} /></button>
        </div>
      )}

      <div className="editor-grid">
        <div className="editor-canvas">
          <div className="editor-title-block">
            <span className="eyebrow"><i /> {isEdit ? 'EDITING' : 'NEW STORY'}</span>
            <input
              className="title-input"
              value={form.title}
              onChange={(event) => update('title', event.target.value)}
              placeholder="一个值得留下的标题"
              aria-label="文章标题"
            />
            {fieldErrors.title && <small className="field-error">{fieldErrors.title}</small>}
            <textarea
              className="excerpt-input"
              value={form.excerpt}
              onChange={(event) => update('excerpt', event.target.value)}
              placeholder="用两三句话告诉读者，这篇文章为什么值得读。"
              rows={3}
              maxLength={400}
              aria-label="文章摘要"
            />
            <div className="excerpt-count">{form.excerpt.length} / 400</div>
            {fieldErrors.excerpt && <small className="field-error">{fieldErrors.excerpt}</small>}
          </div>

          <div className="editor-tabs">
            <button type="button" className={cx(tab === 'write' && 'is-active')} onClick={() => setTab('write')}>
              <PenLine size={15} />
              编辑
            </button>
            <button type="button" className={cx(tab === 'preview' && 'is-active')} onClick={() => setTab('preview')}>
              <Eye size={15} />
              预览
            </button>
            <span className="editor-hint">支持 Markdown</span>
          </div>

          {tab === 'write' ? (
            <div className="markdown-editor">
              <textarea
                value={form.content}
                onChange={(event) => update('content', event.target.value)}
                placeholder={'# 从一个问题开始\n\n写下你的观察、判断和证据。\n\n> 引用一句让你停下来想一想的话。'}
                spellCheck={false}
                aria-label="Markdown 正文"
              />
              <div className="editor-statusbar">
                <span>{form.content.length} 字符</span>
                <span>{form.content.trim() ? form.content.trim().split(/\s+/).length : 0} 词</span>
                <span>Markdown</span>
              </div>
            </div>
          ) : (
            <div className="editor-preview">
              {form.content.trim() ? (
                <Markdown content={form.content} />
              ) : (
                <p className="preview-empty">还没有正文。切回编辑开始写吧。</p>
              )}
            </div>
          )}
          {fieldErrors.content && <small className="field-error">{fieldErrors.content}</small>}

          <div className="editor-preview-note">
            <ImageIcon size={15} />
            封面建议使用 16:10 的横向图片，文件不超过 10MB。图片会通过素材库上传。
          </div>
        </div>

        <aside className="editor-side">
          <section className="editor-card">
            <h3>发布设置</h3>
            <label className="side-field">
              <span>状态</span>
              <div className="side-status">
                <span className={`status-pill ${form.status.toLowerCase()}`}>
                  {form.status === 'PUBLISHED' ? '已发布' : '草稿'}
                </span>
                {post && <small>更新于 {formatDate(post.updatedAt)}</small>}
              </div>
            </label>
            <label className="side-field">
              <span>Slug</span>
              <input
                value={form.slug}
                onChange={(event) => update('slug', event.target.value)}
                placeholder="留空自动生成"
              />
              <small>用于 URL：/posts/{form.slug || '…'}</small>
            </label>
            {fieldErrors.slug && <small className="field-error">{fieldErrors.slug}</small>}
          </section>

          <section className="editor-card">
            <h3>封面</h3>
            {form.coverUrl ? (
              <div className="cover-picker has-cover">
                <img src={form.coverUrl} alt="封面预览" />
                <div className="cover-picker-actions">
                  <button type="button" onClick={() => fileInput.current?.click()}>替换</button>
                  <button type="button" onClick={() => update('coverUrl', '')}>移除</button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className="cover-drop"
                onClick={() => fileInput.current?.click()}
                disabled={uploading}
              >
                {uploading ? <LoaderCircle className="spin" size={20} /> : <Upload size={20} />}
                <strong>{uploading ? '正在上传…' : '上传封面'}</strong>
                <small>JPG / PNG / WebP</small>
              </button>
            )}
            <input
              ref={fileInput}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) void uploadCover(file)
              }}
            />
            <div className="cover-url">
              <span>或粘贴图片地址</span>
              <input
                value={form.coverUrl}
                onChange={(event) => update('coverUrl', event.target.value)}
                placeholder="https://…"
              />
            </div>
          </section>

          <section className="editor-card">
            <h3>标签 <small>最多 5 个</small></h3>
            <div className="tag-editor">
              {form.tags.map((tag) => (
                <span className="tag-chip" key={tag}>
                  {tag}
                  <button type="button" onClick={() => update('tags', form.tags.filter((item) => item !== tag))}>
                    <X size={12} />
                  </button>
                </span>
              ))}
              <input
                value={tagDraft}
                onChange={(event) => setTagDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ',') {
                    event.preventDefault()
                    addTag()
                  }
                }}
                onBlur={addTag}
                placeholder={form.tags.length >= 5 ? '已达上限' : '输入后回车'}
                disabled={form.tags.length >= 5}
              />
            </div>
          </section>

          {post && (
            <section className="editor-card editor-stats">
              <h3>这篇文字</h3>
              <div><span>阅读量</span><strong>{post.viewCount}</strong></div>
              <div><span>创建于</span><strong>{formatDate(post.createdAt)}</strong></div>
              <div><span>阅读时长</span><strong>{post.readingMinutes} 分钟</strong></div>
              <Link to={`/posts/${post.slug}`} target="_blank" className="text-link">
                在站点查看 <ExternalLink size={13} />
              </Link>
            </section>
          )}

          <button
            type="button"
            className="btn btn-ghost editor-leave"
            onClick={() => persist(form.status, true)}
            disabled={Boolean(saving)}
          >
            保存并返回列表
          </button>
        </aside>
      </div>
    </div>
  )
}
