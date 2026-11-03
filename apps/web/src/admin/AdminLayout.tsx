import { useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  ArrowUpRight,
  BarChart3,
  FileText,
  Images,
  LayoutDashboard,
  LogOut,
  Menu,
  PenLine,
  X,
} from 'lucide-react'
import { Logo } from '../components/Logo'
import { useAuth } from '../lib/auth'
import { cx } from '../lib/format'

const navItems = [
  { to: '/admin', label: '总览', icon: LayoutDashboard, end: true },
  { to: '/admin/posts', label: '文章', icon: FileText },
  { to: '/admin/media', label: '素材库', icon: Images },
]

function pageTitle(pathname: string): string {
  if (pathname === '/admin') return '总览'
  if (pathname === '/admin/posts/new') return '新建文章'
  if (pathname.includes('/admin/posts/')) return '编辑文章'
  if (pathname.startsWith('/admin/posts')) return '文章'
  if (pathname.startsWith('/admin/media')) return '素材库'
  return '写作台'
}

export function AdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(false)

  function handleLogout() {
    logout()
    navigate('/admin/login', { replace: true })
  }

  return (
    <div className={cx('admin-shell', open && 'nav-open')}>
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <Logo />
          <span>WRITER'S DESK</span>
        </div>
        <nav className="admin-nav">
          <span className="admin-nav-label">工作区</span>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => cx('admin-nav-item', isActive && 'is-active')}
              onClick={() => setOpen(false)}
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
          <span className="admin-nav-label second">快捷</span>
          <NavLink to="/admin/posts/new" className="admin-nav-item" onClick={() => setOpen(false)}>
            <PenLine size={18} />
            写一篇
          </NavLink>
          <a href="/" target="_blank" rel="noreferrer" className="admin-nav-item">
            <ArrowUpRight size={18} />
            查看站点
          </a>
        </nav>
        <div className="admin-sidebar-foot">
          <div className="admin-user">
            <span className="avatar">{user?.displayName.slice(0, 1).toUpperCase()}</span>
            <div>
              <strong>{user?.displayName}</strong>
              <small>{user?.email}</small>
            </div>
          </div>
          <button type="button" className="icon-button" onClick={handleLogout} title="退出登录">
            <LogOut size={17} />
          </button>
        </div>
      </aside>

      <button type="button" className="admin-scrim" onClick={() => setOpen(false)} aria-label="关闭菜单" />

      <div className="admin-main">
        <header className="admin-topbar">
          <button type="button" className="admin-menu-button" onClick={() => setOpen((value) => !value)}>
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="admin-breadcrumb">
            <span>写作台</span>
            <i>/</i>
            <strong>{pageTitle(location.pathname)}</strong>
          </div>
          <div className="admin-topbar-right">
            <span className="admin-status">
              <i />
              API 正常
            </span>
            <button type="button" className="icon-button" title="数据总览">
              <BarChart3 size={18} />
            </button>
          </div>
        </header>
        <div className="admin-content">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
