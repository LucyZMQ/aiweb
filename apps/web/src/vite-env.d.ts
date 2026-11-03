/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  readonly VITE_BAIDU_TONGJI_ID?: string
  readonly VITE_SITE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

interface Window {
  initGeetest4?: (config: Record<string, unknown>, callback: (captcha: GeetestInstance) => void) => void
  _hmt?: Array<unknown[]>
}

interface GeetestInstance {
  appendTo: (selector: string | HTMLElement) => void
  showCaptcha: () => void
  showBox: () => void
  onReady: (callback: () => void) => void
  onSuccess: (callback: () => void) => void
  onError: (callback: (error: unknown) => void) => void
  getValidate: () => {
    lot_number: string
    captcha_output: string
    pass_token: string
    gen_time: string
  } | null
}
