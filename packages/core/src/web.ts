import { DoctorClient, DoctorClientConfig } from './client'

export function installWebBase(config: DoctorClientConfig): DoctorClient {
  if (window == undefined) {
    throw Error('Not running in a browser!')
  }

  const client = new DoctorClient(config)

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

  return client
}
