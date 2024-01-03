import { Timestamp } from '@bufbuild/protobuf'
import { PRIVATE_KEY_HEADER } from './common'
import {
  BackEndInfo,
  LogSeverity,
  SendBackendEventsRequest,
  SendBackendEventsRequest_Event,
  TraceInfo,
} from './gen/library_pb'
import { CatalystServer } from './server'

jest.useFakeTimers()

afterEach(() => {
  jest.restoreAllMocks()
})

test('flushEvents calls and batches events', async () => {
  const config = {
    baseUrl: 'https://www.example.com',
    version: '123',
    systemName: 'test',
    privateKey: 'key',
  }
  const client = new CatalystServer(config, () => '1')
  const mockFetch = jest.fn(() => Promise.resolve(new Response()))
  global.fetch = mockFetch
  jest.advanceTimersByTime(1000)

  expect(mockFetch).not.toHaveBeenCalled()

  client.recordLog('warn', 'a', {}, { fetchId: '1', sessionId: '1' })
  client.recordLog('warn', 'a', {}, { fetchId: '1', sessionId: '1' })
  jest.advanceTimersByTime(1000)

  expect(mockFetch).toHaveBeenCalledTimes(1)

  const req = await extractRequest(mockFetch)

  expect(req.events).toHaveLength(2)
})

test('flushEvents failing does not generate events', () => {
  const config = {
    baseUrl: 'https://www.example.com',
    version: '123',
    systemName: 'test',
    privateKey: 'key',
  }
  const client = new CatalystServer(config, () => '1')
  const mockFetch = jest.fn(() => Promise.resolve(Response.error()))
  global.fetch = mockFetch
  client.recordLog('warn', 'a', {}, { fetchId: '1', sessionId: '1' })
  jest.advanceTimersByTime(1000)

  expect(mockFetch).toHaveBeenCalledTimes(1)

  jest.advanceTimersByTime(3000)

  expect(mockFetch).toHaveBeenCalledTimes(1)
})

test('recordFetch correctly populates context', async () => {
  const config = {
    baseUrl: 'https://www.example.com',
    version: '123',
    systemName: 'test',
    privateKey: 'key',
  }
  const client = new CatalystServer(config, () => '1-1-1')
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const mockFetch = jest.fn((_1, _2) => Promise.resolve(new Response()))
  global.fetch = mockFetch
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

test('recordFetch correctly populates context', async () => {
  const config = {
    baseUrl: 'https://www.example.com',
    version: '123',
    systemName: 'test',
    privateKey: 'key',
  }
  const client = new CatalystServer(config, () => '1-1-1')
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const mockFetch = jest.fn((_1, _2) => Promise.resolve(new Response()))
  global.fetch = mockFetch
  client.recordFetch(
    'get',
    '/test',
    {},
    200,
    { seconds: 5, nanos: 10 },
    {
      fetchId: '1',
      sessionId: '2',
    }
  )
  jest.advanceTimersByTime(1000)

  expect(mockFetch).toHaveBeenCalledTimes(1)

  const req = await extractRequest(mockFetch)

  expect(req.events[0].event).toStrictEqual(
    new SendBackendEventsRequest_Event({
      event: {},
      traceInfo: {
        fetchId: '1',
        sessionId: '2',
      },
    })
  )
})

test('recordLog correctly populates context', async () => {
  const config = {
    baseUrl: 'https://www.example.com',
    version: '123',
    systemName: 'test',
    privateKey: 'key',
  }
  const client = new CatalystServer(config, () => '1-1-1')
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const mockFetch = jest.fn((_1, _2) => Promise.resolve(new Response()))
  global.fetch = mockFetch
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const mockFetch = jest.fn((url, data) => Promise.resolve(new Response()))
  global.fetch = mockFetch
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const mockFetch = jest.fn((url, data) => Promise.resolve(new Response()))
  global.fetch = mockFetch
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
