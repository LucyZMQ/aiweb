import type { ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import 'highlight.js/styles/github-dark.css'

export interface Heading {
  id: string
  text: string
  level: number
}

function plainText(children: ReactNode): string {
  if (typeof children === 'string' || typeof children === 'number') return String(children)
  if (Array.isArray(children)) return children.map(plainText).join('')
  if (children && typeof children === 'object' && 'props' in children) {
    return plainText((children as { props: { children?: ReactNode } }).props.children)
  }
  return ''
}

export function headingId(text: string): string {
  const slug = text
    .toLowerCase()
    .trim()
    .replace(/[`*_~[\]()#!]/g, '')
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
  return slug || 'section'
}

export function extractHeadings(markdown: string): Heading[] {
  const headings: Heading[] = []
  const regex = /^(#{2,3})\s+(.+)$/gm
  let match: RegExpExecArray | null
  while ((match = regex.exec(markdown)) !== null) {
    const text = match[2].replace(/[*_`]/g, '').trim()
    headings.push({ id: headingId(text), text, level: match[1].length })
  }
  return headings
}

export function Markdown({ content }: { content: string }) {
  return (
    <div className="prose">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          h2: ({ children }) => <h2 id={headingId(plainText(children))}>{children}</h2>,
          h3: ({ children }) => <h3 id={headingId(plainText(children))}>{children}</h3>,
          a: ({ href, children }) => {
            const external = href?.startsWith('http')
            return (
              <a href={href} target={external ? '_blank' : undefined} rel={external ? 'noreferrer' : undefined}>
                {children}
              </a>
            )
          },
          img: ({ src, alt }) => <img src={src} alt={alt || ''} loading="lazy" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
