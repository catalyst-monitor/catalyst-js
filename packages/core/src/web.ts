import { CatalystClient, CatalystClientConfig } from './client'
import { COOKIE_NAME, Severity, parseConsoleArgs } from './common'

export function catalystWebFetch(
  input: RequestInfo | URL,
  init?: RequestInit | undefined
): Promise<Response> {
  const newInit: RequestInit = {
    ...(init ?? {}),
    headers: {
      ...(init?.headers ?? {}),
      ...getCatalyst().getFetchHeaders(),
    },
  }
  return fetch(input, newInit)
}

declare global {
  interface Window {
    __catalystWebInstance: CatalystClient | undefined
  }

  interface Console {
    __catalystOldLog: typeof window.console.log | undefined
    __catalystOldWarn: typeof window.console.warn | undefined
    __catalystOldError: typeof window.console.error | undefined
  }
}

function getCatalyst(): CatalystClient {
  if (window.__catalystWebInstance == null) {
    throw Error(
      'Catalyst has not been instantiated yet! Try running "installWebBase" first!'
    )
  }
  return window.__catalystWebInstance
}

export const getCatalystWeb = getCatalyst

export function installWebBase(config: CatalystClientConfig): CatalystClient {
  if (typeof window == 'undefined') {
    throw Error('Not running in a browser!')
  }

  if (window.__catalystWebInstance != null) {
    if (window.console.__catalystOldWarn != null) {
      window.console.__catalystOldWarn(
        'Catalyst has already been instantiated!'
      )
    }
    return window.__catalystWebInstance
  }

  let existing = null
  const cookieMatch = document.cookie.match(
    `(?:^|;)\\s*${COOKIE_NAME}\\s*=\\s*([^;]+)`
  )
  if (cookieMatch != null) {
    existing = cookieMatch[1]
  } else {
    existing = crypto.randomUUID()
    document.cookie = `${COOKIE_NAME}=${existing}; Expires=0; SameSite=Strict`
  }

  const client = new CatalystClient(config, existing)
  window.__catalystWebInstance = client

  window.console.__catalystOldLog = window.console.log
  window.console.__catalystOldWarn = window.console.warn
  window.console.__catalystOldError = window.console.error

  window.console.log = buildNewConsoleMethod(
    window.console.__catalystOldLog,
    client,
    'info'
  )
  window.console.warn = buildNewConsoleMethod(
    window.console.__catalystOldWarn,
    client,
    'warn'
  )
  window.console.error = buildNewConsoleMethod(
    window.console.__catalystOldError,
    client,
    'error'
  )

  window.addEventListener('error', (e) => {
    client.recordLog('error', e.error, {})
  })
  window.addEventListener('unhandledrejection', (e) => {
    client.recordLog('error', e.reason, {})
  })
  document.body.addEventListener(
    'click',
    (e) => {
      const el = e.target

      if (!(el instanceof HTMLElement)) {
        return
      }
      let querySelector = el.tagName
      if (el.id != null && el.id != '') {
        querySelector += `#${el.id}`
      }
      if (el.classList.length > 0) {
        querySelector += [...el.classList].map((c) => `.${c}`).join('')
      }
      let cleanedText = el.innerText
      const newlineIdx = cleanedText.indexOf('\n')
      if (newlineIdx != -1 || cleanedText.length > 200) {
        cleanedText =
          cleanedText.slice(0, Math.min(cleanedText.indexOf('\n'), 200)) + '...'
      }

      client.recordClick(querySelector, cleanedText)
    },
    { capture: true }
  )

  window.__catalystWebInstance = client
  return client
}

function buildNewConsoleMethod(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  old: (...d: any[]) => void,
  client: CatalystClient,
  severity: Severity
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): (...d: any[]) => void {
  return (...data) => {
    old(...data)
    const parsed = parseConsoleArgs(data)
    if (parsed != null) {
      client.recordLog(severity, parsed[0], parsed[1])
    }
  }
}
