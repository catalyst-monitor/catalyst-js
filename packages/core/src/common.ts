import { Path_Param } from './gen/common'
import { LogSeverity } from './gen/library'

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
  return Object.entries(args).map((entry) => ({
    paramName: entry[0],
    // Should we normalize Array/String here? Should we store varargs in the DB?
    argValue: Array.isArray(entry[1]) ? entry[1].join('/') : entry[1],
  }))
}

export function parseConsoleArgs(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): [string, { [key: number]: any }] | null {
  if (data.length == 0) {
    return null
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const logArgs: { [key: number]: any } = {}
  for (let i = 1; i < data.length; i++) {
    logArgs[i] = data[i]
  }
  return [data[0], logArgs]
}
