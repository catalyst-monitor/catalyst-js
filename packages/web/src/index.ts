export {
  COOKIE_NAME,
  SESSION_ID_HEADER,
  PARENT_FETCH_ID_HEADER,
  PAGE_VIEW_ID_HEADER,
} from './common.js'
export type { Severity } from './common.js'
import {
  COOKIE_NAME,
  type CatalystClientConfig,
  type CatalystInstallConfig,
  type PropagationOptions,
} from './common.js'
import { installConsoleWrappers } from './console_logs.js'
import { installGlobalFetch } from './fetch.js'
import { newId } from './id.js'
import { CatalystWebReporter } from './web_reporter.js'

let instance: CatalystWebReporter | null
const Catalyst = {
  start(
    config: CatalystClientConfig & CatalystInstallConfig & PropagationOptions
  ) {
    let existing = config.existingSessionId
    const cookieMatch = document.cookie.match(
      `(?:^|;)\\s*${COOKIE_NAME}\\s*=\\s*([^;]+)`
    )

    if (existing == null && cookieMatch != null) {
      existing = cookieMatch[1]
    } else if (existing == null) {
      existing = newId(16)
    }
    if (cookieMatch == null || cookieMatch[1] != existing) {
      document.cookie = `${COOKIE_NAME}=${existing}; Expires=0; SameSite=Strict; Path=/`
    }

    const newInstance = new CatalystWebReporter(config, existing)
    instance = newInstance

    if (config.patchConsole != false) {
      installConsoleWrappers(
        (severity, message, params, rawMessage) => {
          newInstance.recordLog({ severity, message, rawMessage, args: params })
        },
        (severity, error) => newInstance.recordError(severity, error)
      )
    }

    if (config.patchFetch != false) {
      installGlobalFetch(newInstance, config)
    }

    if (config.listenUnhandledExceptions != false) {
      window.addEventListener('error', (e) => {
        newInstance.recordError('error', e.error)
      })
      window.addEventListener('unhandledrejection', (e) => {
        newInstance.recordError('error', e.reason)
      })
    }

    if (config.listenClick != false) {
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
          let cleanedText = el.textContent ?? ''
          let isTruncated = false
          const newlineIdx = cleanedText.indexOf('\n')
          if (newlineIdx != -1) {
            cleanedText = cleanedText.slice(0, newlineIdx)
            isTruncated = true
          }
          if (cleanedText.length > 200) {
            cleanedText = cleanedText.slice(0, 200)
            isTruncated = true
          }
          if (isTruncated) {
            cleanedText = cleanedText + '...'
          }
          newInstance.recordClick(querySelector, cleanedText)
        },
        { capture: true }
      )
    }
  },

  getReporter(): CatalystWebReporter {
    if (instance == null) {
      throw new Error('Please call `Catalyst.start(...)` first!')
    }
    return instance
  },

  stop() {
    instance?.stop()
    instance = null
  },
}
export default Catalyst
