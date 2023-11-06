import { DoctorClient, DoctorClientConfig } from './client'
import { COOKIE_NAME } from './common'

export function catalystWebFetch(
  input: RequestInfo | URL,
  init?: RequestInit | undefined
): Promise<Response> {
  const newInit: RequestInit = {
    ...(init ?? {}),
    headers: {
      ...(init?.headers ?? {}),
      ...DoctorClient.get().getFetchHeaders(),
    },
  }
  return fetch(input, newInit)
}

export function installWebBase(config: DoctorClientConfig): DoctorClient {
  if (typeof window == 'undefined') {
    throw Error('Not running in a browser!')
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

  DoctorClient.init(config, existing)
  const client = DoctorClient.get()

  window.addEventListener('error', (e) => {
    client.recordLog('error', e.error, {})
  })
  window.addEventListener('unhandledrejection', (e) => {
    client.recordLog('error', e.reason, {})
  })
  document.body.addEventListener('click', (e) => {
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
  })

  return DoctorClient.get()
}
