import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { trackPageView } from '../lib/api'

const BAIDU_ID = import.meta.env.VITE_BAIDU_TONGJI_ID

export function Analytics() {
  const location = useLocation()

  useEffect(() => {
    if (location.pathname.startsWith('/admin')) return
    trackPageView(location.pathname)
    if (BAIDU_ID) {
      window._hmt = window._hmt || []
      window._hmt.push(['_trackPageview', location.pathname])
    }
  }, [location.pathname])

  useEffect(() => {
    if (!BAIDU_ID || document.querySelector('script[data-moyu-baidu]')) return
    const script = document.createElement('script')
    script.src = `https://hm.baidu.com/hm.js?${BAIDU_ID}`
    script.async = true
    script.dataset.moyuBaidu = 'true'
    document.head.appendChild(script)
  }, [])

  return null
}
