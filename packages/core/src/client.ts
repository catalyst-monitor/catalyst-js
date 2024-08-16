import { Timestamp } from '@bufbuild/protobuf'
import {
  SESSION_ID_HEADER,
  objectToParams,
  toProtoSeverity,
  type Severity,
  PAGE_VIEW_ID_HEADER,
  DEFAULT_BASE_URL,
  PUBLIC_KEY_HEADER,
} from './common.js'
import { Path } from './gen/catalyst/common/common_pb.js'
import {
  Click,
  Log,
  LogArg,
  PageView,
  SendFrontendEventsRequest,
  SendFrontendEventsRequest_Event,
} from './gen/catalyst/common/library_pb.js'

export interface CatalystClientConfig {
  baseUrl?: string
  version: string
  systemName: string
  userAgent?: string
  publicKey?: string
  disabled?: boolean
}

export interface ClientFetchHeaders {
  [SESSION_ID_HEADER]: string
  [PAGE_VIEW_ID_HEADER]?: string
}

export class CatalystClient {
  private eventQueue: SendFrontendEventsRequest_Event[] = []
  private loggedInEmail: string | null
  private loggedInId: string | null
  private currentPageViewId: string | null = null
  private baseUrl: string

  constructor(
    public readonly config: CatalystClientConfig,
    public readonly sessionId: string
  ) {
    this.loggedInEmail = null
    this.loggedInId = null
    this.baseUrl = config.baseUrl ?? DEFAULT_BASE_URL
    setInterval(() => {
      this.flushEvents()
    }, 1000)
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
    this.currentPageViewId = crypto.randomUUID()
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
            id: crypto.randomUUID(),
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
            id: crypto.randomUUID(),
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
