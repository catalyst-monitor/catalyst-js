import { Path_Param } from './gen/catalyst/common/common_pb.js'
import { LogSeverity } from './gen/catalyst/common/library_pb.js'

export const PUBLIC_KEY_HEADER = 'X-Catalyst-Public-Key'
export const PRIVATE_KEY_HEADER = 'X-Catalyst-Private-Key'

export const SESSION_ID_HEADER = 'X-Catalyst-SessionId'
export const PARENT_FETCH_ID_HEADER = 'X-Catalyst-ParentFetchId'
export const PAGE_VIEW_ID_HEADER = 'X-Catalyst-PageViewId'

export const COOKIE_NAME = 'catalystmonitorsession'

export const DEFAULT_BASE_URL = 'https://app.catalystmonitor.com'

export type Severity = 'info' | 'warn' | 'error'

export function toProtoSeverity(severity: Severity): LogSeverity {
  switch (severity) {
    case 'info':
      return LogSeverity.INFO_LOG_SEVERITY
    case 'warn':
      return LogSeverity.WARNING_LOG_SEVERITY
    case 'error':
      return LogSeverity.ERROR_LOG_SEVERITY
  }
}

export function objectToParams(args: {
  [key: string]: string | string[]
}): Path_Param[] {
  return Object.entries(args).map(
    (entry) =>
      new Path_Param({
        paramName: entry[0],
        // Should we normalize Array/String here? Should we store varargs in the DB?
        argValue: Array.isArray(entry[1]) ? entry[1].join('/') : entry[1],
      })
  )
}

export type ConsoleLogCallback = (
  severity: Severity,
  message: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params: { [key: number]: any },
  rawMessage: string
) => void

export type ConsoleErrorCallback = (severity: Severity, error: Error) => void

export function installConsoleWrappers(
  instance: {
    console: {
      log: typeof console.log
      warn: typeof console.warn
      error: typeof console.error
      __catalystOldLog: typeof console.log | undefined
      __catalystOldWarn: typeof console.warn | undefined
      __catalystOldError: typeof console.error | undefined
    }
  },
  onLog: ConsoleLogCallback,
  onError: ConsoleErrorCallback
) {
  instance.console.__catalystOldLog = instance.console.log
  instance.console.__catalystOldWarn = instance.console.warn
  instance.console.__catalystOldError = instance.console.error

  instance.console.log = buildNewConsoleMethod(
    instance.console.__catalystOldLog,
    'info',
    onLog,
    onError
  )
  instance.console.warn = buildNewConsoleMethod(
    instance.console.__catalystOldWarn,
    'warn',
    onLog,
    onError
  )
  instance.console.error = buildNewConsoleMethod(
    instance.console.__catalystOldError,
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
