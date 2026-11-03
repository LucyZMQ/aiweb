import { Link } from 'react-router-dom'

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="logo" aria-label="墨屿 MOYU 首页">
      <span className="logo-mark" aria-hidden="true">
        <svg viewBox="0 0 44 44" role="img">
          <rect width="44" height="44" rx="12" fill="currentColor" />
          <path
            d="M12 31.5c8-1.3 14.6-7.2 18.3-18.2 2.1 9.7-1.4 19.4-11.4 22.2-3.6.9-6-.4-6.9-4Z"
            fill="#dce9bb"
          />
          <path
            d="M14.5 30.5c4.4-4.4 8.9-8.2 14.4-12.2"
            fill="none"
            stroke="#17231d"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </span>
      {!compact && (
        <span className="logo-copy">
          <strong>墨屿</strong>
          <small>MOYU · NOTES</small>
        </span>
      )}
    </Link>
  )
}
