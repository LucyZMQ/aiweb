import { useEffect, useRef, useState } from 'react'
import { Check, Cloud, Copy, HardDrive, ImagePlus, LoaderCircle, Trash2, UploadCloud } from 'lucide-react'
import { api } from '../lib/api'
import type { MediaItem } from '../lib/types'
import { fileSize, formatDate } from '../lib/format'
import { useToast } from '../components/Toast'
import { cx } from '../lib/format'

export function Media() {
  const { notify } = useToast()
  const input = useRef<HTMLInputElement>(null)
  const [items, setItems] = useState<MediaItem[]>([])
  const [provider, setProvider] = useState<'local' | 'cos'>('local')
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [copied, setCopied] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<MediaItem | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    let cancelled = false
    api
      .media()
      .then((data) => {
        if (cancelled) return
        setItems(data.items)
        setProvider(data.provider)
      })
      .catch((err: Error) => notify(err.message, 'error'))
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [notify])

  async function uploadFiles(files: FileList | File[]) {
    const list = Array.from(files).filter((file) => file.type.startsWith('image/'))
    if (list.length === 0) {
      notify('请选择图片文件', 'error')
      return
    }
    setUploading(true)
    let success = 0
    for (const file of list) {
      try {
        const asset = await api.uploadMedia(file)
        setItems((current) => [asset, ...current])
        success += 1
      } catch (err) {
        notify(`${file.name}：${(err as Error).message}`, 'error')
      }
    }
    if (success > 0) notify(`已上传 ${success} 张图片`)
    setUploading(false)
    if (input.current) input.current.value = ''
  }

  async function copyUrl(item: MediaItem) {
    const absolute = new URL(item.url, window.location.origin).href
    try {
      await navigator.clipboard.writeText(absolute)
      setCopied(item.id)
      window.setTimeout(() => setCopied(''), 1800)
    } catch {
      notify('复制失败，请手动复制', 'error')
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.deleteMedia(deleteTarget.id)
      setItems((current) => current.filter((item) => item.id !== deleteTarget.id))
      setDeleteTarget(null)
      notify('素材已删除')
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
          <span className="eyebrow"><i /> LIBRARY</span>
          <h1>素材库</h1>
          <p>封面与插图。上传后直接复制地址，或通过编辑器插入。</p>
        </div>
        <span className="provider-badge">
          {provider === 'cos' ? <Cloud size={15} /> : <HardDrive size={15} />}
          {provider === 'cos' ? '腾讯云 COS' : '本地磁盘'}
        </span>
      </div>

      <div
        className={cx('upload-zone', dragging && 'is-dragging', uploading && 'is-uploading')}
        onDragOver={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault()
          setDragging(false)
          void uploadFiles(event.dataTransfer.files)
        }}
        onClick={() => !uploading && input.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') input.current?.click()
        }}
      >
        <span className="upload-icon">
          {uploading ? <LoaderCircle className="spin" size={24} /> : <UploadCloud size={24} />}
        </span>
        <strong>{uploading ? '正在上传…' : '把图片拖到这里，或点击选择'}</strong>
        <small>JPG / PNG / WebP / GIF / AVIF · 单张不超过 10MB</small>
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
          multiple
          hidden
          onChange={(event) => {
            if (event.target.files) void uploadFiles(event.target.files)
          }}
        />
      </div>

      {loading ? (
        <div className="media-grid">
          {Array.from({ length: 6 }).map((_, index) => (
            <div className="media-card skeleton" key={index}>
              <div className="skeleton-media" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="media-empty">
          <ImagePlus size={28} />
          <h3>素材库还是空的</h3>
          <p>上传第一张封面，它会出现在这里。</p>
        </div>
      ) : (
        <div className="media-grid">
          {items.map((item) => (
            <figure className="media-card" key={item.id}>
              <div className="media-image">
                <img src={item.url} alt={item.originalName} loading="lazy" />
                <div className="media-overlay">
                  <button type="button" onClick={() => copyUrl(item)}>
                    {copied === item.id ? <Check size={15} /> : <Copy size={15} />}
                    {copied === item.id ? '已复制' : '复制地址'}
                  </button>
                  <button type="button" className="danger" onClick={() => setDeleteTarget(item)}>
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
              <figcaption>
                <strong title={item.originalName}>{item.originalName}</strong>
                <span>{fileSize(item.sizeBytes)} · {formatDate(item.createdAt)}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      )}

      {deleteTarget && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="确认删除素材">
          <div className="modal">
            <span className="modal-kicker">DELETE</span>
            <h2>删除这张图片？</h2>
            <p>已引用这张图片的文章可能会显示空白。这个动作无法撤销。</p>
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setDeleteTarget(null)}>取消</button>
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
