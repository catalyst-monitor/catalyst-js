import type { Severity } from './common.js'

export type ConsoleLogCallback = (
  severity: Severity,
  message: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params: { [key: number]: any },
  rawMessage: string
) => void

export type ConsoleErrorCallback = (severity: Severity, error: Error) => void

declare global {
  interface Console {
    __catalystOldLog: typeof window.console.log | undefined
    __catalystOldWarn: typeof window.console.warn | undefined
    __catalystOldError: typeof window.console.error | undefined
  }
}

export function installConsoleWrappers(
  onLog: ConsoleLogCallback,
  onError: ConsoleErrorCallback
) {
  globalThis.console.__catalystOldLog = globalThis.console.log
  globalThis.console.__catalystOldWarn = globalThis.console.warn
  globalThis.console.__catalystOldError = globalThis.console.error

  globalThis.console.log = buildNewConsoleMethod(
    globalThis.console.__catalystOldLog,
    'info',
    onLog,
    onError
  )
  globalThis.console.warn = buildNewConsoleMethod(
    globalThis.console.__catalystOldWarn,
    'warn',
    onLog,
    onError
  )
  globalThis.console.error = buildNewConsoleMethod(
    globalThis.console.__catalystOldError,
    'error',
    onLog,
    onError
  )
}

function buildNewConsoleMethod(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  old: (...d: any[]) => void,
  severity: Severity,
  onLog: ConsoleLogCallback,
  onError: ConsoleErrorCallback
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): (...d: any[]) => void {
  return (...data) => {
    old(...data)
    if (data.length == 0) {
      return
    }
    const message = data[0]
    if (message instanceof Error && data.length == 1) {
      onError(severity, message)
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const logArgs: { [key: number]: unknown } = {}
      for (let i = 1; i < data.length; i++) {
        logArgs[i] = data[i]
      }
      const rawMessage = data.join(' ')
      onLog(severity, message, logArgs, rawMessage)
    }
  }
}
