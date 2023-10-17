import { Path_Param } from './gen/common'
import { LogSeverity } from './gen/library'

export const SESSION_ID_HEADER = 'X-Doctor-SessionId'

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
