import { Link } from 'react-router-dom'
import { ArrowUpRight, Github, Mail } from 'lucide-react'
import { Header } from '../components/Header'
import { Footer } from '../components/Footer'

const stack = [
  { layer: '界面', tech: 'React 19 · Vite · TypeScript', note: '公开站点与写作台共用一套设计语言' },
  { layer: '接口', tech: 'Spring Boot 3.5 · Java 21', note: '无状态、可水平扩展，Swagger 描述全部契约' },
  { layer: '数据', tech: 'PostgreSQL 18 · Flyway', note: '文章、用户、素材与 PV/UV 都在同一个事务边界内' },
  { layer: '登录', tech: 'JWT · 邮箱验证码 · 极验 v4', note: '不保存密码，验证码一次性使用并限流' },
  { layer: '素材', tech: '腾讯云 COS · CDN', note: '本地磁盘与对象存储可切换，上传后不再回源应用' },
  { layer: '交付', tech: 'Docker · Caddy · GitHub Actions', note: '自动 HTTPS、镜像部署、飞书通知' },
  { layer: '观察', tech: '第一方埋点 · 百度统计', note: 'PV/UV 自有数据 + 成熟的第三方来源分析' },
]

export function About() {
  return (
    <div className="site">
      <Header />
      <main>
        <section className="about-hero shell">
          <div className="about-copy">
            <span className="eyebrow">
              <i />
              ABOUT THE ISLAND
            </span>
            <h1>
              关于这座
              <em>墨色的小岛</em>
            </h1>
            <p className="about-lead">
              墨屿是一个人的写作空间，也是一次完整的工程练习：从第一行接口，
              到域名、证书、CDN，再到一条能自动发布并通知的流水线。
            </p>
          </div>
          <div className="about-art" aria-hidden="true">
            <div className="about-art-inner">
              <span>MOYU</span>
              <strong>墨</strong>
              <small>31°14′N<br />121°29′E</small>
            </div>
            <div className="about-art-caption">
              <span>EST. 2026</span>
              <span>SHANGHAI / REMOTE</span>
            </div>
          </div>
        </section>

        <section className="about-story shell">
          <div className="story-index">01 / 起点</div>
          <div className="story-body">
            <h2>为什么要有这个站</h2>
            <p>
              我们每天都在读别人的结论，却很少有机会完整地看完一个东西是怎么被造出来的。
              这个站想补上这一段：不只展示结果，也记录选择、取舍和踩过的坑。
            </p>
            <p>
              它刻意保持小。没有评论区，没有复杂的推荐算法，没有为了增长而设计的钩子。
              只有文章、一点统计数据，和一个足够好用的写作台。
            </p>
            <blockquote>
              “一个好的个人项目，应该让你在两年后还能读懂它，并且愿意继续改。”
            </blockquote>
          </div>
        </section>

        <section className="about-stack">
          <div className="shell">
            <div className="section-head">
              <div>
                <span className="eyebrow">
                  <i />
                  UNDER THE HOOD
                </span>
                <h2>这座岛是怎么搭的</h2>
              </div>
              <span className="stack-note">不是教程，是一份可检查的清单。</span>
            </div>
            <div className="stack-table">
              {stack.map((item, index) => (
                <div className="stack-row" key={item.layer}>
                  <span className="stack-no">{String(index + 1).padStart(2, '0')}</span>
                  <span className="stack-layer">{item.layer}</span>
                  <strong>{item.tech}</strong>
                  <p>{item.note}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="about-story shell">
          <div className="story-index">02 / 原则</div>
          <div className="story-body">
            <h2>三条不太容易坚持的原则</h2>
            <div className="principle-list">
              <div>
                <span>一</span>
                <h3>先让它正确，再让它漂亮</h3>
                <p>接口契约、数据约束、失败处理，这些不显眼的部分决定了系统能不能安心睡觉。</p>
              </div>
              <div>
                <span>二</span>
                <h3>每个外部依赖都要有出口</h3>
                <p>邮件可以从日志切到 SMTP，存储可以从磁盘切到 COS，部署可以从服务器切到 PaaS。</p>
              </div>
              <div>
                <span>三</span>
                <h3>数据只收集到够用</h3>
                <p>不存原始 IP，不做跨站追踪。知道有多少人读、从哪里来，已经足够。</p>
              </div>
            </div>
          </div>
        </section>

        <section className="about-contact">
          <div className="shell about-contact-inner">
            <div>
              <span className="eyebrow light">
                <i />
                SAY HELLO
              </span>
              <h2>有想法，或者只是想聊聊？</h2>
              <p>欢迎写信，告诉我你在构建什么，或者这个站哪里还可以更好。</p>
            </div>
            <div className="contact-actions">
              <a href="mailto:hello@moyu.local" className="btn btn-lime">
                <Mail size={16} />
                写封信
              </a>
              <a
                href="https://github.com"
                target="_blank"
                rel="noreferrer"
                className="btn btn-outline-light"
              >
                <Github size={16} />
                GitHub
              </a>
            </div>
          </div>
        </section>

        <section className="about-next shell">
          <span className="eyebrow">
            <i />
            NEXT READ
          </span>
          <Link to="/posts/a-quiet-release" className="next-read">
            <span>推荐阅读</span>
            <strong>一次安静的发布：从提交到上线的 9 分钟</strong>
            <ArrowUpRight size={22} />
          </Link>
        </section>
      </main>
      <Footer />
    </div>
  )
}
