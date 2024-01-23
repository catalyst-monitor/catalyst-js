import { Timestamp } from '@bufbuild/protobuf'
import { PRIVATE_KEY_HEADER } from './common'
import {
  BackEndInfo,
  Fetch,
  Log,
  LogSeverity,
  SendBackendEventsRequest,
  SendBackendEventsRequest_Event,
  TraceInfo,
} from './gen/library_pb'
import { CatalystServer } from './server'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const mockFetch = jest.fn((_1, _2) => Promise.resolve(new Response()))
global.fetch = mockFetch

beforeEach(() => {
  jest.useFakeTimers()
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
  jest.advanceTimersByTime(1000)
  client.recordLog('warn', 'a', {}, { fetchId: '1', sessionId: '1' })
  jest.advanceTimersByTime(1000)

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
  jest.advanceTimersByTime(1000)

  expect(mockFetch).not.toHaveBeenCalled()

  client.recordLog('warn', 'a', {}, { fetchId: '1', sessionId: '1' })
  client.recordLog('warn', 'a', {}, { fetchId: '1', sessionId: '1' })
  jest.advanceTimersByTime(1000)

  expect(mockFetch).toHaveBeenCalledTimes(1)

  const req = await extractRequest(mockFetch)

  expect(req.events).toHaveLength(2)
})

test('flushEvents retries', async () => {
  jest.setSystemTime(new Date(2020, 2, 2))
  const config = {
    baseUrl: 'https://www.example.com',
    version: '123',
    systemName: 'test',
    privateKey: 'key',
  }
  const client = new CatalystServer(config, () => '1')
  mockFetch.mockImplementationOnce(() => Promise.reject(new Error('hi')))
  client.recordLog('warn', 'a', {}, { fetchId: '1', sessionId: '1' })
  const recordTime = Timestamp.now()
  await jest.advanceTimersByTimeAsync(1000)

  expect(mockFetch).toHaveBeenCalledTimes(1)

  mockFetch.mockClear()
  await jest.advanceTimersByTimeAsync(3000)

  expect(mockFetch).toHaveBeenCalledTimes(1)
  const req = await extractRequest(mockFetch)

  expect(req.events[0].event).toStrictEqual({
    case: 'log',
    value: new Log({
      time: recordTime,
      message: 'a',
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
    client.recordLog('warn', 'b', {}, { fetchId: '1', sessionId: '1' })
  }
  const recordTime = Timestamp.now()
  mockFetch.mockImplementationOnce(() => Promise.reject(new Error('hi')))
  await jest.advanceTimersByTimeAsync(1000)

  expect(mockFetch).toHaveBeenCalledTimes(1)

  mockFetch.mockClear()
  await jest.advanceTimersByTimeAsync(3000)

  expect(mockFetch).toHaveBeenCalledTimes(1)
  const req = await extractRequest(mockFetch)

  expect(req.events).toHaveLength(1000)
  for (let i = 0; i < 1000; i++) {
    expect(req.events[0].event).toStrictEqual({
      case: 'log',
      value: new Log({
        time: recordTime,
        message: 'b',
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
    'get',
    '/test',
    {},
    200,
    { seconds: 5, nanos: 10 },
    {
      fetchId: '1',
      sessionId: '2',
      pageViewId: '3',
      parentFetchId: '4',
      loggedInEmail: 'email',
      loggedInId: 'id',
    }
  )
  jest.advanceTimersByTime(1000)

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
  jest.setSystemTime(new Date(2020, 2, 2))
  const config = {
    baseUrl: 'https://www.example.com',
    version: '123',
    systemName: 'test',
    privateKey: 'key',
  }
  const client = new CatalystServer(config, () => '1-1-1')
  client.recordFetch(
    'get',
    '/test',
    {
      test1: '1',
      test2: '2',
    },
    200,
    { seconds: 5, nanos: 10 },
    {
      fetchId: '1',
      sessionId: '2',
    }
  )
  const recordTime = Timestamp.now()
  jest.advanceTimersByTime(1000)

  expect(mockFetch).toHaveBeenCalledTimes(1)

  const req = await extractRequest(mockFetch)

  expect(req.events[0].event).toStrictEqual({
    case: 'fetch',
    value: new Fetch({
      endTime: recordTime,
      method: 'get',
      path: {
        pattern: '/test',
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
    'warn',
    'a',
    {},
    {
      fetchId: '1',
      sessionId: '2',
      pageViewId: '3',
      parentFetchId: '4',
      loggedInEmail: 'email',
      loggedInId: 'id',
    }
  )
  jest.advanceTimersByTime(1000)

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
  jest.setSystemTime(new Date(2023, 12, 25))
  const config = {
    baseUrl: 'https://www.example.com',
    version: '123',
    systemName: 'test',
    privateKey: 'key',
  }

  const client = new CatalystServer(config, () => '1-1-1')
  const recordTime = Timestamp.now()
  client.recordLog(
    'warn',
    'test test',
    {
      test: 1,
      test2: '2',
    },
    { fetchId: '1', sessionId: '2' }
  )
  jest.advanceTimersByTime(1000)

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

test('recordLog populates records error message', async () => {
  jest.setSystemTime(new Date(2023, 12, 25))
  const config = {
    baseUrl: 'https://www.example.com',
    version: '123',
    systemName: 'test',
    privateKey: 'key',
  }
  const client = new CatalystServer(config, () => '1-1-1')
  const recordTime = Timestamp.now()
  const testErr = new Error('hello')
  client.recordLog('error', testErr, {}, { fetchId: '1', sessionId: '2' })
  jest.advanceTimersByTime(1000)

  const req = await extractRequest(mockFetch)

  expect(req.events).toStrictEqual([
    new SendBackendEventsRequest_Event({
      event: {
        case: 'log',
        value: {
          id: '1-1-1',
          logSeverity: LogSeverity.ERROR_LOG_SEVERITY,
          message: 'hello',
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

async function extractRequest(mockFn: jest.Mock) {
  const body = mockFn.mock.calls[0][1].body
  return SendBackendEventsRequest.fromBinary(new Uint8Array(body))
}
