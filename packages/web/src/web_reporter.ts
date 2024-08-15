import { Timestamp } from '@bufbuild/protobuf'
import {
  SESSION_ID_HEADER,
  type Severity,
  PAGE_VIEW_ID_HEADER,
  DEFAULT_BASE_URL,
  PUBLIC_KEY_HEADER,
  type CatalystClientConfig,
  type ClientFetchHeaders,
} from './common.js'
import { Path, Path_Param } from './gen/catalyst/common/common_pb.js'
import {
  Click,
  Log,
  LogArg,
  LogSeverity,
  PageView,
  SendFrontendEventsRequest,
  SendFrontendEventsRequest_Event,
} from './gen/catalyst/common/library_pb.js'
import { newId } from './id.js'

export class CatalystWebReporter {
  private eventQueue: SendFrontendEventsRequest_Event[] = []
  private loggedInEmail: string | null
  private loggedInId: string | null
  private currentPageViewId: string | null = null
  private baseUrl: string
  private intervalId: ReturnType<typeof setInterval> | null

  constructor(
    public readonly config: CatalystClientConfig,
    public readonly sessionId: string
  ) {
    this.loggedInEmail = null
    this.loggedInId = null
    this.baseUrl = config.baseUrl ?? DEFAULT_BASE_URL
    this.intervalId = setInterval(() => {
      this.flushEvents()
    }, 1000)
  }

  stop() {
    if (this.intervalId != null) {
      clearInterval(this.intervalId)
    }
  }

  async flushEvents() {
    if (this.config.disabled == true) {
      return
    }
    if (this.eventQueue.length == 0) {
      return
    }
    const copy = [...this.eventQueue]
    this.eventQueue = []

    // We cannot leave the fetch uncaught, otherwise, it will
    // generate a log message that we then need to send the next time.
    try {
      await fetch(`${this.baseUrl}/api/ingest/fe`, {
        method: 'put',
        body: new SendFrontendEventsRequest({
          events: copy,
          info: {
            name: this.config.systemName,
            loggedInEmail: this.loggedInEmail ?? '',
            loggedInId: this.loggedInId ?? '',
            sessionId: this.sessionId,
            userAgent: this.config.userAgent ?? '',
            version: this.config.version,
          },
        }).toBinary(),
        headers: {
          [PUBLIC_KEY_HEADER]: this.config.publicKey || '',
        },
      })
    } catch (e) {
      const logFn =
        '__catalystOldError' in window.console &&
        window.console.__catalystOldError != null
          ? window.console.__catalystOldError
          : window.console.error
      logFn(
        'Could not report events!',
        e,
        'Dropping the following events',
        copy
      )
    }
  }

  setUserInfo(
    userInfo: {
      loggedInUserName: string
      loggedInId: string
    } | null
  ) {
    this.loggedInEmail = userInfo?.loggedInUserName ?? null
    this.loggedInId = userInfo?.loggedInId ?? null
  }

  get pageViewId() {
    return this.currentPageViewId
  }

  getFetchHeaders(): ClientFetchHeaders {
    const headers: ClientFetchHeaders = {
      [SESSION_ID_HEADER]: this.sessionId,
    }
    if (this.currentPageViewId != null) {
      headers[PAGE_VIEW_ID_HEADER] = this.currentPageViewId
    }
    return headers
  }

  recordPageView({
    rawPath,
    pathPattern,
    args,
  }: {
    rawPath: string
    pathPattern: string
    args: { [key: string]: string | string[] }
  }) {
    this.currentPageViewId = newId(8)
    this.eventQueue.push(
      new SendFrontendEventsRequest_Event({
        pageViewId: this.currentPageViewId,
        event: {
          case: 'pageView',
          value: new PageView({
            time: Timestamp.now(),
            path: new Path({
              rawPath,
              pattern: pathPattern,
              params: objectToParams(args),
            }),
          }),
        },
      })
    )
  }

  recordClick(selector: string, text: string) {
    this.eventQueue.push(
      new SendFrontendEventsRequest_Event({
        pageViewId: this.currentPageViewId ?? '',
        event: {
          case: 'click',
          value: new Click({
            id: newId(8),
            buttonText: text,
            selector: selector,
            time: Timestamp.now(),
          }),
        },
      })
    )
  }

  recordError(severity: Severity, error: Error) {
    this.recordLog({
      severity,
      message: error.message,
      rawMessage: error.message,
      stackTrace: error.stack,
      args: {},
    })
  }

  recordLog({
    severity,
    message,
    rawMessage,
    stackTrace,
    args,
  }: {
    severity: Severity
    message: string
    rawMessage: string
    stackTrace?: string
    args: { [key: string | number]: string | number }
  }) {
    this.eventQueue.push(
      new SendFrontendEventsRequest_Event({
        pageViewId: this.currentPageViewId ?? '',
        event: {
          case: 'log',
          value: new Log({
            id: newId(8),
            message,
            rawMessage,
            stackTrace: stackTrace ?? '',
            logSeverity: toProtoSeverity(severity),
            time: Timestamp.now(),
            logArgs: Object.entries(args).map((entry) => {
              let logValue:
                | { case: 'strVal'; value: string }
                | { case: 'intVal'; value: number }
                | { case: 'doubleVal'; value: number }
              if (typeof entry[1] == 'string') {
                logValue = { case: 'strVal', value: entry[1] }
              } else if (Number.isInteger(entry[1]) == true) {
                logValue = { case: 'intVal', value: entry[1] }
              } else {
                logValue = { case: 'doubleVal', value: entry[1] }
              }
              return new LogArg({
                logValue,
                paramName: entry[0],
              })
            }),
          }),
        },
      })
    )
  }
}

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
