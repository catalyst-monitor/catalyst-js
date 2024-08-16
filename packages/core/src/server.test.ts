import { Timestamp } from '@bufbuild/protobuf'
import { PRIVATE_KEY_HEADER } from './common.js'
import {
  BackEndInfo,
  Fetch,
  Log,
  LogSeverity,
  SendBackendEventsRequest,
  SendBackendEventsRequest_Event,
  TraceInfo,
} from './gen/catalyst/common/library_pb.js'
import { CatalystServer } from './server.js'
import type { Mock } from 'vitest'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const mockFetch = vitest.fn((_1, _2) => Promise.resolve(new Response()))
global.fetch = mockFetch

beforeEach(() => {
  vitest.useFakeTimers()
  mockFetch.mockClear()
  mockFetch.mockReset()
})

test('flushEvents sends nothing if disabled', async () => {
  const config = {
    baseUrl: 'https://www.example.com',
    version: '123',
    systemName: 'test',
    privateKey: 'key',
    disabled: true,
  }
  const client = new CatalystServer(config, () => '1')
  vitest.advanceTimersByTime(1000)
  client.recordLog(
    {
      severity: 'warn',
      message: 'a',
      rawMessage: 'a',
      args: {},
    },
    { fetchId: '1', sessionId: '1' }
  )
  vitest.advanceTimersByTime(1000)

  expect(mockFetch).toHaveBeenCalledTimes(0)

  client.flushEvents()

  expect(mockFetch).toHaveBeenCalledTimes(0)
})

test('flushEvents calls and batches events', async () => {
  const config = {
    baseUrl: 'https://www.example.com',
    version: '123',
    systemName: 'test',
    privateKey: 'key',
  }
  const client = new CatalystServer(config, () => '1')
  vitest.advanceTimersByTime(1000)

  expect(mockFetch).not.toHaveBeenCalled()

  client.recordLog(
    {
      severity: 'warn',
      message: 'a',
      rawMessage: 'a',
      args: {},
    },
    { fetchId: '1', sessionId: '1' }
  )
  client.recordLog(
    {
      severity: 'warn',
      message: 'a',
      rawMessage: 'a',
      args: {},
    },
    { fetchId: '1', sessionId: '1' }
  )
  vitest.advanceTimersByTime(1000)

  expect(mockFetch).toHaveBeenCalledTimes(1)

  const req = await extractRequest(mockFetch)

  expect(req.events).toHaveLength(2)
})

test('flushEvents retries', async () => {
  vitest.setSystemTime(new Date(2020, 2, 2))
  const config = {
    baseUrl: 'https://www.example.com',
    version: '123',
    systemName: 'test',
    privateKey: 'key',
  }
  const client = new CatalystServer(config, () => '1')
  mockFetch.mockImplementationOnce(() => Promise.reject(new Error('hi')))
  client.recordLog(
    {
      severity: 'warn',
      message: 'a',
      rawMessage: 'a',
      args: {},
    },
    { fetchId: '1', sessionId: '1' }
  )
  const recordTime = Timestamp.now()
  await vitest.advanceTimersByTimeAsync(1000)

  expect(mockFetch).toHaveBeenCalledTimes(1)

  mockFetch.mockClear()
  await vitest.advanceTimersByTimeAsync(3000)

  expect(mockFetch).toHaveBeenCalledTimes(1)
  const req = await extractRequest(mockFetch)

  expect(req.events[0].event).toStrictEqual({
    case: 'log',
    value: new Log({
      time: recordTime,
      message: 'a',
      rawMessage: 'a',
      logSeverity: LogSeverity.WARNING_LOG_SEVERITY,
      id: '1',
    }),
  })
})

test('flushEvents retries with max event count', async () => {
  const config = {
    baseUrl: 'https://www.example.com',
    version: '123',
    systemName: 'test',
    privateKey: 'key',
  }
  const client = new CatalystServer(config, () => '1')
  for (let i = 0; i < 1002; i++) {
    client.recordLog(
      {
        severity: 'warn',
        message: 'b',
        rawMessage: 'b',
        args: {},
      },
      { fetchId: '1', sessionId: '1' }
    )
  }
  const recordTime = Timestamp.now()
  mockFetch.mockImplementationOnce(() => Promise.reject(new Error('hi')))
  await vitest.advanceTimersByTimeAsync(1000)

  expect(mockFetch).toHaveBeenCalledTimes(1)

  mockFetch.mockClear()
  await vitest.advanceTimersByTimeAsync(3000)

  expect(mockFetch).toHaveBeenCalledTimes(1)
  const req = await extractRequest(mockFetch)

  expect(req.events).toHaveLength(1000)
  for (let i = 0; i < 1000; i++) {
    expect(req.events[0].event).toStrictEqual({
      case: 'log',
      value: new Log({
        time: recordTime,
        message: 'b',
        rawMessage: 'b',
        logSeverity: LogSeverity.WARNING_LOG_SEVERITY,
        id: '1',
      }),
    })
  }
})

test('recordFetch correctly populates context', async () => {
  const config = {
    baseUrl: 'https://www.example.com',
    version: '123',
    systemName: 'test',
    privateKey: 'key',
  }
  const client = new CatalystServer(config, () => '1-1-1')
  client.recordFetch(
    {
      method: 'get',
      pathPattern: '/test',
      args: {},
      rawPath: '/test',
      statusCode: 200,
      duration: { seconds: 5, nanos: 10 },
    },
    {
      fetchId: '1',
      sessionId: '2',
      pageViewId: '3',
      parentFetchId: '4',
      loggedInUserName: 'email',
      loggedInId: 'id',
    }
  )
  vitest.advanceTimersByTime(1000)

  expect(mockFetch).toHaveBeenCalledTimes(1)

  const req = await extractRequest(mockFetch)

  expect(req.info).toStrictEqual(
    new BackEndInfo({
      name: 'test',
      version: '123',
    })
  )
  expect(req.events[0].traceInfo).toStrictEqual(
    new TraceInfo({
      fetchId: '1',
      loggedInEmail: 'email',
      loggedInId: 'id',
      pageViewId: '3',
      parentFetchId: '4',
      sessionId: '2',
    })
  )
  expect(mockFetch.mock.calls[0][1].headers[PRIVATE_KEY_HEADER]).toBe('key')
})

test('recordFetch correctly sends event', async () => {
  vitest.setSystemTime(new Date(2020, 2, 2))
  const config = {
    baseUrl: 'https://www.example.com',
    version: '123',
    systemName: 'test',
    privateKey: 'key',
  }
  const client = new CatalystServer(config, () => '1-1-1')
  client.recordFetch(
    {
      method: 'get',
      pathPattern: '/test/{test1}/{test2}',
      rawPath: '/test/1/2',
      args: {
        test1: '1',
        test2: '2',
      },
      statusCode: 200,
      duration: { seconds: 5, nanos: 10 },
    },
    {
      fetchId: '1',
      sessionId: '2',
    }
  )
  const recordTime = Timestamp.now()
  vitest.advanceTimersByTime(1000)

  expect(mockFetch).toHaveBeenCalledTimes(1)

  const req = await extractRequest(mockFetch)

  expect(req.events[0].event).toStrictEqual({
    case: 'fetch',
    value: new Fetch({
      endTime: recordTime,
      method: 'get',
      path: {
        pattern: '/test/{test1}/{test2}',
        rawPath: '/test/1/2',
        params: [
          { argValue: '1', paramName: 'test1' },
          { argValue: '2', paramName: 'test2' },
        ],
      },
      requestDuration: { seconds: BigInt(5), nanos: 10 },
      statusCode: 200,
    }),
  })
})

test('recordLog correctly populates context', async () => {
  const config = {
    baseUrl: 'https://www.example.com',
    version: '123',
    systemName: 'test',
    privateKey: 'key',
  }
  const client = new CatalystServer(config, () => '1-1-1')
  client.recordLog(
    {
      severity: 'warn',
      message: 'a',
      rawMessage: 'a',
      args: {},
    },
    {
      fetchId: '1',
      sessionId: '2',
      pageViewId: '3',
      parentFetchId: '4',
      loggedInUserName: 'email',
      loggedInId: 'id',
    }
  )
  vitest.advanceTimersByTime(1000)

  expect(mockFetch).toHaveBeenCalledTimes(1)

  const req = await extractRequest(mockFetch)

  expect(req.info).toStrictEqual(
    new BackEndInfo({
      name: 'test',
      version: '123',
    })
  )
  expect(req.events[0].traceInfo).toStrictEqual(
    new TraceInfo({
      fetchId: '1',
      loggedInEmail: 'email',
      loggedInId: 'id',
      pageViewId: '3',
      parentFetchId: '4',
      sessionId: '2',
    })
  )
  expect(mockFetch.mock.calls[0][1].headers[PRIVATE_KEY_HEADER]).toBe('key')
})

test('recordLog populates records string message with params', async () => {
  vitest.setSystemTime(new Date(2023, 12, 25))
  const config = {
    baseUrl: 'https://www.example.com',
    version: '123',
    systemName: 'test',
    privateKey: 'key',
  }

  const client = new CatalystServer(config, () => '1-1-1')
  const recordTime = Timestamp.now()
  client.recordLog(
    {
      severity: 'warn',
      message: 'test test',
      rawMessage: 'test test test1:1 test2:"2"',
      args: { test: 1, test2: '2' },
    },
    { fetchId: '1', sessionId: '2' }
  )
  vitest.advanceTimersByTime(1000)

  const req = await extractRequest(mockFetch)

  expect(req.events).toStrictEqual([
    new SendBackendEventsRequest_Event({
      event: {
        case: 'log',
        value: {
          id: '1-1-1',
          logArgs: [
            {
              logValue: {
                case: 'intVal',
                value: 1,
              },
              paramName: 'test',
            },
            {
              logValue: {
                case: 'strVal',
                value: '2',
              },
              paramName: 'test2',
            },
          ],
          logSeverity: LogSeverity.WARNING_LOG_SEVERITY,
          message: 'test test',
          rawMessage: 'test test test1:1 test2:"2"',
          stackTrace: undefined,
          time: recordTime,
        },
      },
      traceInfo: {
        fetchId: '1',
        sessionId: '2',
      },
    }),
  ])

  expect(mockFetch).toHaveBeenCalledTimes(1)
  expect(mockFetch.mock.calls[0][1].headers[PRIVATE_KEY_HEADER]).toBe('key')
})

test('recordError populates records error message', async () => {
  vitest.setSystemTime(new Date(2023, 12, 25))
  const config = {
    baseUrl: 'https://www.example.com',
    version: '123',
    systemName: 'test',
    privateKey: 'key',
  }
  const client = new CatalystServer(config, () => '1-1-1')
  const recordTime = Timestamp.now()
  const testErr = new Error('hello')
  client.recordError('error', testErr, { fetchId: '1', sessionId: '2' })
  vitest.advanceTimersByTime(1000)

  const req = await extractRequest(mockFetch)

  expect(req.events).toStrictEqual([
    new SendBackendEventsRequest_Event({
      event: {
        case: 'log',
        value: {
          id: '1-1-1',
          logSeverity: LogSeverity.ERROR_LOG_SEVERITY,
          message: 'hello',
          rawMessage: 'hello',
          stackTrace: testErr.stack,
          time: recordTime,
        },
      },
      traceInfo: {
        fetchId: '1',
        sessionId: '2',
      },
    }),
  ])

  expect(mockFetch).toHaveBeenCalledTimes(1)
})

async function extractRequest(mockFn: Mock) {
  const body = mockFn.mock.calls[0][1].body
  return SendBackendEventsRequest.fromBinary(new Uint8Array(body))
}
