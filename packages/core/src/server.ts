import { Duration, Timestamp } from '@bufbuild/protobuf'
import {
  DEFAULT_BASE_URL,
  PARENT_FETCH_ID_HEADER,
  PRIVATE_KEY_HEADER,
  SESSION_ID_HEADER,
  Severity,
  objectToParams,
  toProtoSeverity,
} from './common'
import {
  Fetch,
  Log,
  LogArg,
  SendBackendEventsRequest,
  SendBackendEventsRequest_Event,
  TraceInfo,
} from './gen/library_pb'

export interface CatalystServerConfig {
  baseUrl?: string
  version: string
  systemName: string
  privateKey: string
}

export interface ServerFetchHeaders {
  [SESSION_ID_HEADER]: string
  [PARENT_FETCH_ID_HEADER]: string
}

export class CatalystServer {
  private baseUrl: string
  private eventQueue: SendBackendEventsRequest_Event[] = []

  constructor(
    public readonly config: CatalystServerConfig,
    private readonly uuidGenerator: () => string
  ) {
    this.baseUrl = config.baseUrl ?? DEFAULT_BASE_URL
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
      await fetch(`${this.baseUrl}/api/ingest/be`, {
        method: 'put',
        body: new SendBackendEventsRequest({
          events: copy,
          info: {
            name: this.config.systemName,
            version: this.config.version,
          },
        }).toBinary(),
        headers: {
          [PRIVATE_KEY_HEADER]: this.config.privateKey,
        },
        cache: 'no-store',
      })
    } catch (e) {
      const logFn =
        '__catalystOldError' in globalThis.console &&
        globalThis.console.__catalystOldError != null
          ? globalThis.console.__catalystOldError
          : globalThis.console.error
      logFn(
        'Could not report events!',
        e,
        'Dropping the following events',
        copy
      )
    }
  }

  getFetchHeaders(context: ServerRequestContext): ServerFetchHeaders {
    return {
      [SESSION_ID_HEADER]: context.sessionId,
      [PARENT_FETCH_ID_HEADER]: context.fetchId,
    }
  }

  recordFetch(
    method: string,
    pattern: string,
    args: { [key: string]: string },
    statusCode: number,
    duration: { seconds: number; nanos: number },
    context: ServerRequestContext
  ) {
    this.eventQueue.push(
      new SendBackendEventsRequest_Event({
        traceInfo: contextToTrace(context),
        event: {
          case: 'fetch',
          value: new Fetch({
            method: method.toLowerCase(),
            path: {
              pattern,
              params: objectToParams(args),
            },
            requestDuration: new Duration({
              // The input seconds supports a smaller number than the PB library.
              // This is done because in most cases, we don't need the size.
              // date-fns difference functions return a number, for instance.
              // Javascript's max int is basically a 53 bit integer.
              seconds: BigInt(duration.seconds),
              nanos: duration.nanos,
            }),
            statusCode,
            endTime: Timestamp.now(),
          }),
        },
      })
    )
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
    this.eventQueue.push(
      new SendBackendEventsRequest_Event({
        traceInfo: contextToTrace(context),
        event: {
          case: 'log',
          value: new Log({
            id: this.uuidGenerator(),
            message: messageStr,
            stackTrace: stack ?? '',
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

export interface ServerRequestContext {
  fetchId: string
  sessionId: string
  loggedInEmail?: string
  loggedInId?: string
  pageViewId?: string
  parentFetchId?: string
}

function contextToTrace(context: ServerRequestContext): TraceInfo {
  return new TraceInfo({
    fetchId: context.fetchId,
    sessionId: context.sessionId,
    loggedInEmail: context.loggedInEmail ?? '',
    loggedInId: context.loggedInId ?? '',
    pageViewId: context.pageViewId ?? '',
    parentFetchId: context.parentFetchId ?? '',
  })
}
