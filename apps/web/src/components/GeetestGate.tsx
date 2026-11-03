import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import type { CaptchaConfig, CaptchaPayload } from '../lib/types'

export interface GeetestHandle {
  show: () => void
}

interface Props {
  config: CaptchaConfig | null
  onSuccess: (payload: CaptchaPayload) => void
  onError: (message: string) => void
}

const SCRIPT_ID = 'geetest-v4-sdk'

function loadSdk(): Promise<void> {
  if (window.initGeetest4) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error('极验 SDK 加载失败')))
      return
    }
    const script = document.createElement('script')
    script.id = SCRIPT_ID
    script.src = 'https://static.geetest.com/v4/gt4.js'
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('极验 SDK 加载失败'))
    document.head.appendChild(script)
  })
}

export const GeetestGate = forwardRef<GeetestHandle, Props>(function GeetestGate(
  { config, onSuccess, onError },
  ref,
) {
  const instance = useRef<GeetestInstance | null>(null)
  const successRef = useRef(onSuccess)
  const errorRef = useRef(onError)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    successRef.current = onSuccess
    errorRef.current = onError
  }, [onSuccess, onError])

  useEffect(() => {
    if (!config?.enabled || !config.captchaId) return
    let disposed = false
    loadSdk()
      .then(() => {
        if (disposed || !window.initGeetest4) return
        window.initGeetest4(
          {
            captchaId: config.captchaId,
            product: 'float',
            language: 'zho',
            hideBar: ['close'],
          },
          (captcha) => {
            if (disposed) return
            instance.current = captcha
            captcha.onSuccess(() => {
              const result = captcha.getValidate()
              if (!result) {
                errorRef.current('未获取到人机验证结果，请重试')
                return
              }
              successRef.current({
                lotNumber: result.lot_number,
                captchaOutput: result.captcha_output,
                passToken: result.pass_token,
                genTime: result.gen_time,
              })
            })
            captcha.onError(() => errorRef.current('人机验证出错，请重试'))
            setReady(true)
          },
        )
      })
      .catch((error: Error) => errorRef.current(error.message))
    return () => {
      disposed = true
    }
  }, [config?.enabled, config?.captchaId])

  useImperativeHandle(ref, () => ({
    show: () => {
      if (!config?.enabled) return
      if (instance.current) {
        instance.current.showCaptcha()
      } else {
        errorRef.current(ready ? '人机验证尚未就绪，请稍后重试' : '正在加载人机验证…')
      }
    },
  }))

  return null
})
