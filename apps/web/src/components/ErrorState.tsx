import { Link } from 'react-router-dom'
import { ArrowLeft, RefreshCw } from 'lucide-react'

export function ErrorState({
  title = '这一页暂时走丢了',
  message = '可能是链接失效，或者内容已经被移走。',
  onRetry,
}: {
  title?: string
  message?: string
  onRetry?: () => void
}) {
  return (
    <div className="error-state shell">
      <span className="error-code">404</span>
      <h1>{title}</h1>
      <p>{message}</p>
      <div className="error-actions">
        <Link to="/" className="btn btn-dark">
          <ArrowLeft size={16} />
          回到首页
        </Link>
        {onRetry && (
          <button type="button" className="btn btn-ghost" onClick={onRetry}>
            <RefreshCw size={16} />
            再试一次
          </button>
        )}
      </div>
    </div>
  )
}
