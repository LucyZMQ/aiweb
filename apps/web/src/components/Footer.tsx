import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import { Logo } from './Logo'

const API_DOCS = `${(import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '')}/swagger-ui.html`
const hasBaidu = Boolean(import.meta.env.VITE_BAIDU_TONGJI_ID)

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="shell">
        <div className="footer-top">
          <div className="footer-brand">
            <Logo />
            <p>在技术的海边，写下一些坐标。</p>
            <span className="footer-status">
              <i />
              系统运行中
            </span>
          </div>
          <div className="footer-links">
            <div>
              <small>阅读</small>
              <Link to="/">首页</Link>
              <Link to="/#articles">全部文章</Link>
              <Link to="/about">关于墨屿</Link>
            </div>
            <div>
              <small>参与</small>
              <Link to="/admin">写作台</Link>
              <a href={API_DOCS} target="_blank" rel="noreferrer">
                API 文档 <ArrowUpRight size={12} />
              </a>
              <a href="mailto:hello@moyu.local">写封信</a>
            </div>
          </div>
        </div>
        <div className="footer-wordmark" aria-hidden="true">
          MOYU
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} 墨屿 MOYU. 保留所有权利。</span>
          <span>
            Spring Boot · PostgreSQL · React
            {hasBaidu ? ' · 百度统计已接入' : ''}
          </span>
        </div>
      </div>
    </footer>
  )
}
