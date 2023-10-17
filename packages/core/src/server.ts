import {
  SESSION_ID_HEADER,
  Severity,
  objectToParams,
  toProtoSeverity,
} from './common'
import {
  SendBackendEventsRequest,
  SendBackendEventsRequest_Event,
  TraceInfo,
} from './gen/library'

export interface DoctorServerConfig {
  baseUrl: string
  version: string
  systemName: string
  privateKey: string
}

export class DoctorServer {
  private static instance: DoctorServer | null = null

  static create(config: DoctorServerConfig) {
    DoctorServer.instance = new DoctorServer(config)
  }

  static get(): DoctorServer {
    console.log('GOT INSTANCE', DoctorServer.instance, 'window', typeof window)
    if (DoctorServer.instance == null) {
      const e = Error('test')
      console.log('st', e.stack)
      throw e
      // throw Error('Must create instance first!')
    }
    return DoctorServer.instance
  }

  readonly sessionId: string
  private eventQueue: SendBackendEventsRequest_Event[] = []

  constructor(public readonly config: DoctorServerConfig) {
    this.sessionId = crypto.randomUUID()
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

    await fetch(`${this.config.baseUrl}/api/ingest/be`, {
      body: SendBackendEventsRequest.encode({
        events: copy,
        info: {
          name: this.config.systemName,
          version: this.config.version,
        },
      }).finish(),
      headers: {
        ['X-DOCTOR-PRIVATE-KEY']: this.config.privateKey,
      },
    })
  }

  getFetchHeaders(): { [SESSION_ID_HEADER]: string } {
    return {
      [SESSION_ID_HEADER]: this.sessionId,
    }
  }

  recordFetch(
    pattern: string,
    args: { [key: string]: string },
    duration: { seconds: number; nanos: number },
    context: ServerRequestContext
  ) {
    this.eventQueue.push({
      traceInfo: contextToTrace(context),
      fetch: {
        path: {
          pattern,
          params: objectToParams(args),
        },
        requestDuration: duration,
        statusCode: 0,
        time: new Date(),
      },
    })
  }

  recordLog(
    severity: Severity,
    message: unknown,
    args: { [key: string | number]: string | number },
    context: ServerRequestContext
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
      traceInfo: contextToTrace(context),
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

export interface ServerRequestContext {
  fetchId: string
  sessionId: string
  loggedInEmail?: string
  loggedInId?: string
  pageViewId?: string
  parentFetchId?: string
}

function contextToTrace(context: ServerRequestContext): TraceInfo {
  return {
    fetchId: context.fetchId,
    sessionId: context.sessionId,
    loggedInEmail: context.loggedInEmail ?? '',
    loggedInId: context.loggedInId ?? '',
    pageViewId: context.pageViewId ?? '',
    parentFetchId: context.parentFetchId ?? '',
  }
}
