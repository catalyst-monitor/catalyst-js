import { Path_Param } from './gen/common_pb'
import { LogSeverity } from './gen/library_pb'

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
  onLog: (
    severity: Severity,
    message: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    params: { [key: number]: any }
  ) => void
) {
  instance.console.__catalystOldLog = instance.console.log
  instance.console.__catalystOldWarn = instance.console.warn
  instance.console.__catalystOldError = instance.console.error

  instance.console.log = buildNewConsoleMethod(
    instance.console.__catalystOldLog,
    'info',
    onLog
  )
  instance.console.warn = buildNewConsoleMethod(
    instance.console.__catalystOldWarn,
    'warn',
    onLog
  )
  instance.console.error = buildNewConsoleMethod(
    instance.console.__catalystOldError,
    'error',
    onLog
  )
}

function buildNewConsoleMethod(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  old: (...d: any[]) => void,
  severity: Severity,
  onLog: (
    severity: Severity,
    message: string,
    params: { [key: number]: unknown }
  ) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): (...d: any[]) => void {
  return (...data) => {
    old(...data)
    if (data.length == 0) {
      return
    }
    const message = data[0]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const logArgs: { [key: number]: unknown } = {}
    for (let i = 1; i < data.length; i++) {
      logArgs[i] = data[i]
    }
    onLog(severity, message, logArgs)
  }
}
