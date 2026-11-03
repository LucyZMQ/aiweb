import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, LoaderCircle, Mail, ShieldCheck } from 'lucide-react'
import { api } from '../lib/api'
import type { CaptchaConfig, CaptchaPayload } from '../lib/types'
import { useAuth } from '../lib/auth'
import { useToast } from '../components/Toast'
import { GeetestGate } from '../components/GeetestGate'
import type { GeetestHandle } from '../components/GeetestGate'
import { Logo } from '../components/Logo'

export function Login() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { notify } = useToast()
  const gate = useRef<GeetestHandle>(null)

  const [email, setEmail] = useState('admin@moyu.local')
  const [code, setCode] = useState('')
  const [devCode, setDevCode] = useState('')
  const [captcha, setCaptcha] = useState<CaptchaConfig | null>(null)
  const [cooldown, setCooldown] = useState(0)
  const [sending, setSending] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const from = (location.state as { from?: string } | null)?.from || '/admin'

  useEffect(() => {
    api.captchaConfig().then(setCaptcha).catch(() => setCaptcha({ enabled: false }))
  }, [])

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = window.setInterval(() => setCooldown((value) => Math.max(0, value - 1)), 1000)
    return () => window.clearInterval(timer)
  }, [cooldown])

  if (user) return <Navigate to="/admin" replace />

  function validEmail(): boolean {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('请输入有效的邮箱地址')
      return false
    }
    return true
  }

  async function sendCode(payload: CaptchaPayload | null) {
    if (!validEmail() || sending || cooldown > 0) return
    setSending(true)
    setError('')
    try {
      const result = await api.requestEmailCode(email.trim(), payload)
      setCooldown(60)
      if (result.devCode) {
        setDevCode(result.devCode)
        notify(`开发模式验证码：${result.devCode}`, 'info')
      } else {
        notify('验证码已发送，请检查邮箱')
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSending(false)
    }
  }

  function handleSend() {
    if (!captcha || !validEmail() || sending || cooldown > 0) return
    if (captcha?.enabled) {
      gate.current?.show()
      return
    }
    void sendCode(null)
  }

  function handleCaptchaSuccess(payload: CaptchaPayload) {
    void sendCode(payload)
  }

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault()
    if (!validEmail()) return
    if (code.trim().length < 4) {
      setError('请输入邮箱中的验证码')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const result = await api.login(email.trim(), code.trim())
      login(result.token, result.user)
      notify(`欢迎回来，${result.user.displayName}`)
      navigate(from, { replace: true })
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="login-page">
      <aside className="login-art">
        <div className="login-art-top">
          <Logo />
          <Link to="/" className="login-home">
            <ArrowLeft size={14} />
            回到博客
          </Link>
        </div>
        <div className="login-quote">
          <span className="eyebrow light">
            <i />
            WRITER'S DESK
          </span>
          <h1>
            写下来，
            <br />
            才算真正
            <br />
            <em>想清楚。</em>
          </h1>
          <p>一个安静的写作台。文章、素材与数据，都在同一个地方。</p>
        </div>
        <div className="login-art-foot">
          <span>MOYU / ADMIN</span>
          <span>SECURE · PASSWORDLESS</span>
        </div>
        <div className="login-orbit" aria-hidden="true" />
      </aside>

      <main className="login-panel">
        <div className="login-mobile-head">
          <Logo />
          <Link to="/">
            <ArrowLeft size={14} />
            回到博客
          </Link>
        </div>
        <div className="login-form-wrap">
          <span className="eyebrow">
            <i />
            SIGN IN
          </span>
          <h2>回到写作台</h2>
          <p className="login-intro">输入邮箱，我们会发送一封一次性验证码。无需密码。</p>

          <form onSubmit={handleLogin} className="login-form">
            <label>
              <span>邮箱</span>
              <div className="input-with-icon">
                <Mail size={17} />
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                />
              </div>
            </label>

            <label>
              <span>验证码</span>
              <div className="code-row">
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={code}
                  onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="6 位数字"
                  maxLength={6}
                />
                <button
                  type="button"
                  className="code-button"
                  onClick={handleSend}
                  disabled={!captcha || sending || cooldown > 0}
                >
                  {sending ? <LoaderCircle className="spin" size={15} /> : null}
                  {sending ? '发送中' : cooldown > 0 ? `${cooldown}s 后重发` : '发送验证码'}
                </button>
              </div>
            </label>

            {devCode && (
              <button type="button" className="dev-code" onClick={() => setCode(devCode)}>
                <span>开发模式</span>
                验证码 <strong>{devCode}</strong> · 点击填入
              </button>
            )}

            {error && <div className="form-error">{error}</div>}

            <button type="submit" className="btn btn-dark login-submit" disabled={submitting}>
              {submitting ? <LoaderCircle className="spin" size={17} /> : null}
              {submitting ? '正在验证…' : '进入写作台'}
              {!submitting && <ArrowRight size={17} />}
            </button>
          </form>

          <div className="login-note">
            <ShieldCheck size={16} />
            <p>
              登录即表示同意仅将邮箱用于身份验证。验证码 5 分钟内有效，
              连续输错 5 次会失效。
            </p>
          </div>

          <p className="login-local">
            本地体验：使用 <code>admin@moyu.local</code>，验证码会直接显示在页面上。
            生产环境请设置 <code>ADMIN_EMAILS</code> 与 SMTP。
          </p>
        </div>
      </main>

      <GeetestGate
        ref={gate}
        config={captcha}
        onSuccess={handleCaptchaSuccess}
        onError={(message) => {
          setError(message)
          notify(message, 'error')
        }}
      />
    </div>
  )
}
