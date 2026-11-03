import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { PostSummary } from '../lib/types'
import { cx, formatDate } from '../lib/format'

export function Cover({
  src,
  title,
  className,
}: {
  src?: string
  title: string
  className?: string
}) {
  if (!src) {
    return (
      <div className={cx('post-cover cover-fallback', className)}>
        <span>{title.slice(0, 1)}</span>
      </div>
    )
  }
  return (
    <div className={cx('post-cover', className)}>
      <img src={src} alt="" loading="lazy" />
    </div>
  )
}

export function PostCard({ post, featured = false }: { post: PostSummary; featured?: boolean }) {
  return (
    <article className={cx('post-card', featured && 'is-featured')}>
      <Link to={`/posts/${post.slug}`} className="post-card-link" aria-label={post.title}>
        <Cover src={post.coverUrl} title={post.title} />
        <div className="post-card-body">
          <div className="post-card-meta">
            <span>{formatDate(post.publishedAt)}</span>
            <span className="meta-dot" />
            <span>{post.readingMinutes} 分钟阅读</span>
            {featured && <span className="featured-label">编辑精选</span>}
          </div>
          <h3>{post.title}</h3>
          <p>{post.excerpt}</p>
          <div className="post-card-foot">
            <div className="tag-row">
              {post.tags.slice(0, 3).map((tag) => (
                <span className="tag" key={tag}>
                  {tag}
                </span>
              ))}
            </div>
            <span className="card-arrow">
              <ArrowUpRight size={17} />
            </span>
          </div>
        </div>
      </Link>
    </article>
  )
}

export function PostCardSkeleton() {
  return (
    <article className="post-card skeleton-card">
      <div className="skeleton skeleton-cover" />
      <div className="post-card-body">
        <div className="skeleton skeleton-line short" />
        <div className="skeleton skeleton-line title" />
        <div className="skeleton skeleton-line" />
        <div className="skeleton skeleton-line medium" />
      </div>
    </article>
  )
}
