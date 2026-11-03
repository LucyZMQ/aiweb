import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { ArrowUpRight, Menu, X } from 'lucide-react'
import { Logo } from './Logo'
import { cx } from '../lib/format'

const API_DOCS = `${(import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '')}/swagger-ui.html`

export function Header() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    setOpen(false)
  }, [location.pathname, location.hash])

  return (
    <header className={cx('site-header', scrolled && 'is-scrolled', open && 'is-open')}>
      <div className="shell header-inner">
        <Logo />
        <nav className={cx('main-nav', open && 'is-open')} aria-label="主导航">
          <NavLink to="/" end className="nav-link">
            首页
          </NavLink>
          <Link to="/#articles" className="nav-link">
            文章
          </Link>
          <NavLink to="/about" className="nav-link">
            关于
          </NavLink>
          <a href={API_DOCS} target="_blank" rel="noreferrer" className="nav-link">
            接口文档
            <ArrowUpRight size={13} />
          </a>
        </nav>
        <div className="header-actions">
          <Link to="/admin" className="admin-entry">
            写作台
            <span className="admin-dot" />
          </Link>
          <button
            type="button"
            className="menu-toggle"
            onClick={() => setOpen((value) => !value)}
            aria-label={open ? '关闭菜单' : '打开菜单'}
            aria-expanded={open}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>
    </header>
  )
}
