import { DoctorClient, DoctorClientConfig, ExistingSessionInfo } from './client'

export function installWebBase(
  config: DoctorClientConfig,
  existingSession?: ExistingSessionInfo
): DoctorClient {
  if (typeof window == 'undefined') {
    throw Error('Not running in a browser!')
  }

  const client = new DoctorClient(config, existingSession)

  window.addEventListener('error', (e) => {
    client.recordLog('error', e.error, {})
  })
  window.addEventListener('unhandledrejection', (e) => {
    client.recordLog('error', e.reason, {})
  })
  document.body.addEventListener('click', (e) => {
    const el = e.currentTarget

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
    client.recordClick(querySelector, el.innerText)
  })

  DoctorClient.create(config)
  return DoctorClient.get()
}
