import {
  LogSeverity,
  SendFrontendEventsRequest,
  SendFrontendEventsRequest_Event,
} from './gen/library'

const SESSION_ID_HEADER = 'X-Doctor-SessionId'

export type Severity = 'info' | 'warn' | 'error'

function toProtoSeverity(severity: Severity): LogSeverity {
  switch (severity) {
    case 'info':
      return LogSeverity.INFO_LOG_SEVERITY
    case 'warn':
      return LogSeverity.WARNING_LOG_SEVERITY
    case 'error':
      return LogSeverity.ERROR_LOG_SEVERITY
  }
}

export interface DoctorClientConfig {
  baseUrl: string
  loggedInEmail?: string
  loggedInId?: string
  userAgent: string
  version: string
  systemName: string
}

export class DoctorClient {
  readonly sessionId: string
  private eventQueue: SendFrontendEventsRequest_Event[] = []
  private loggedInEmail: string | null
  private loggedInId: string | null
  private currentPageViewId: string | null = null

  constructor(public readonly config: DoctorClientConfig) {
    this.sessionId = crypto.randomUUID()
    this.loggedInEmail = config.loggedInEmail ?? null
    this.loggedInId = config.loggedInId ?? null
    setInterval(() => {
      this.flushEvents()
    }, 5 * 1000)
  }

  async flushEvents() {
    if (this.eventQueue.length == 0) {
      return
    }
    const copy = [...this.eventQueue]
    this.eventQueue = []
    await fetch(`${this.config.baseUrl}/api/ingest/fe`, {
      body: SendFrontendEventsRequest.encode({
        events: copy,
        info: {
          name: this.config.systemName,
          loggedInEmail: this.loggedInEmail ?? '',
          loggedInId: this.loggedInId ?? '',
          sessionId: this.sessionId,
          userAgent: this.config.userAgent,
          version: this.config.version,
        },
      }).finish(),
    })
  }

  setUserCreds({
    loggedInEmail,
    loggedInId,
  }: {
    loggedInEmail: string
    loggedInId: string
  }) {
    this.loggedInEmail = loggedInEmail
    this.loggedInId = loggedInId
  }

  getFetchHeaders(): { [SESSION_ID_HEADER]: string } {
    return {
      [SESSION_ID_HEADER]: this.sessionId,
    }
  }

  recordPageView(pattern: string, args: { [key: string]: string }) {
    this.currentPageViewId = crypto.randomUUID()
    this.eventQueue.push({
      pageViewId: this.currentPageViewId,
      pageView: {
        time: new Date(),
        path: {
          pattern,
          params: Object.entries(args).map((entry) => ({
            paramName: entry[0],
            argValue: entry[1],
          })),
        },
      },
    })
  }

  recordClick(selector: string, text: string) {
    this.eventQueue.push({
      pageViewId: this.currentPageViewId ?? '',
      click: {
        id: crypto.randomUUID(),
        buttonText: text,
        selector: selector,
        time: new Date(),
      },
    })
  }

  recordLog(
    severity: Severity,
    message: string | Error,
    args: { [key: string | number]: string | number }
  ) {
    let messageStr: string
    let stack: string | null = null
    if (message instanceof Error) {
      messageStr = message.message
      if ('stack' in message) {
        stack = message.stack ?? null
      }
    } else {
      messageStr = message
    }
    this.eventQueue.push({
      pageViewId: this.currentPageViewId ?? '',
      log: {
        id: crypto.randomUUID(),
        message: messageStr,
        stackTrace: stack ?? '',
        logSeverity: toProtoSeverity(severity),
        time: new Date(),
        logArgs: Object.entries(args).map((entry) => {
          let argKey: 'stringVal' | 'intVal' | 'floatVal'
          if (typeof entry[1] == 'string') {
            argKey = 'stringVal'
          } else if (Number.isInteger(entry[1]) == true) {
            argKey = 'intVal'
          } else {
            argKey = 'floatVal'
          }
          return {
            paramName: entry[0],
            [argKey]: entry[1],
          }
        }),
      },
    })
  }
}
