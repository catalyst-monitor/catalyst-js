import {
  SESSION_ID_HEADER,
  objectToParams,
  toProtoSeverity,
  Severity,
  PAGE_VIEW_ID_HEADER,
} from './common'
import {
  SendFrontendEventsRequest,
  SendFrontendEventsRequest_Event,
} from './gen/library'

export interface DoctorClientConfig {
  baseUrl: string
  version: string
  systemName: string
  userAgent?: string
  publicKey?: string
}

export interface ClientFetchHeaders {
  [SESSION_ID_HEADER]: string
  [PAGE_VIEW_ID_HEADER]?: string
}

export class DoctorClient {
  private static instance: DoctorClient | null = null

  static init(config: DoctorClientConfig, sessionId: string): DoctorClient {
    if (DoctorClient.instance == null) {
      DoctorClient.instance = new DoctorClient(config, sessionId)
    }
    return DoctorClient.instance
  }

  static get(): DoctorClient {
    if (DoctorClient.instance == null) {
      throw Error('Must create instance first!')
    }
    return DoctorClient.instance
  }

  private eventQueue: SendFrontendEventsRequest_Event[] = []
  private loggedInEmail: string | null
  private loggedInId: string | null
  private currentPageViewId: string | null = null

  constructor(
    public readonly config: DoctorClientConfig,
    public readonly sessionId: string
  ) {
    this.loggedInEmail = null
    this.loggedInId = null
    setInterval(() => {
      this.flushEvents()
    }, 1000)
  }

  async flushEvents() {
    if (this.eventQueue.length == 0) {
      return
    }
    const copy = [...this.eventQueue]
    this.eventQueue = []

    // We cannot leave the fetch uncaught, otherwise, it will
    // generate a log message that we then need to send the next time.
    try {
      await fetch(`${this.config.baseUrl}/api/ingest/fe`, {
        method: 'put',
        body: SendFrontendEventsRequest.encode({
          events: copy,
          info: {
            name: this.config.systemName,
            loggedInEmail: this.loggedInEmail ?? '',
            loggedInId: this.loggedInId ?? '',
            sessionId: this.sessionId,
            userAgent: this.config.userAgent ?? '',
            version: this.config.version,
          },
        }).finish(),
        headers: {
          ['X-DOCTOR-PUBLIC-KEY']: this.config.publicKey || '',
        },
      })
    } catch (e) {
      if (window.console.__catalystOldError != null) {
        window.console.__catalystOldError(
          'Could not report events!',
          e,
          'Dropping the following events',
          copy
        )
      } else {
        console.error(
          'Could not report events!',
          e,
          'Dropping the following events',
          copy
        )
      }
    }
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

  recordPageView(pattern: string, args: { [key: string]: string | string[] }) {
    this.currentPageViewId = crypto.randomUUID()
    this.eventQueue.push({
      pageViewId: this.currentPageViewId,
      pageView: {
        time: new Date(),
        path: {
          pattern,
          params: objectToParams(args),
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
    message: unknown,
    args: { [key: string | number]: string | number }
  ) {
    let messageStr: string
    let stack: string | null = null
    if (message instanceof Error) {
      messageStr = message.message
      if ('stack' in message) {
        stack = message.stack ?? null
      }
    } else if (typeof message == 'string') {
      messageStr = message
    } else {
      messageStr = '' + message
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
