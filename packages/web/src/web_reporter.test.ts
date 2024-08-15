// @vitest-environment jsdom

import { CatalystWebReporter } from './web_reporter.js'
import {
  FrontEndInfo,
  LogSeverity,
  SendFrontendEventsRequest,
  SendFrontendEventsRequest_Event,
} from './gen/catalyst/common/library_pb.js'
import {
  PAGE_VIEW_ID_HEADER,
  PUBLIC_KEY_HEADER,
  SESSION_ID_HEADER,
} from './common.js'
import { Timestamp } from '@bufbuild/protobuf'
import { vi, afterEach, test, expect, type Mock, beforeEach } from 'vitest'

vi.useFakeTimers()

afterEach(() => {
  vi.restoreAllMocks()
})

const FAKE_RANDOM_ID = '0101010101010101'

beforeEach(() => {
  crypto.getRandomValues = vi.fn((a) => {
    a.fill(1)
    return a
  })
})

test('flushEvents sends nothing if disabled', async () => {
  const config = {
    baseUrl: 'https://www.example.com',
    version: '123',
    systemName: 'test',
    userAgent: 'ua',
    publicKey: 'key',
    disabled: true,
  }
  const sessionId = 'asdf'
  const client = new CatalystWebReporter(config, sessionId)
  const mockFetch = vi.fn(() => Promise.resolve(new Response()))
  window.fetch = mockFetch

  client.recordClick('a', 'a')
  vi.advanceTimersByTime(1000)

  expect(mockFetch).toHaveBeenCalledTimes(0)

  client.flushEvents()

  expect(mockFetch).toHaveLength(0)
})

test('flushEvents calls and batches events', async () => {
  const config = {
    baseUrl: 'https://www.example.com',
    version: '123',
    systemName: 'test',
    userAgent: 'ua',
    publicKey: 'key',
  }
  const sessionId = 'asdf'
  const client = new CatalystWebReporter(config, sessionId)
  const mockFetch = vi.fn(() => Promise.resolve(new Response()))
  window.fetch = mockFetch
  vi.advanceTimersByTime(1000)

  expect(mockFetch).not.toHaveBeenCalled()

  client.recordClick('a', 'a')
  client.recordClick('a', 'a')
  vi.advanceTimersByTime(1000)

  expect(mockFetch).toHaveBeenCalledTimes(1)

  const req = await extractRequest(mockFetch)

  expect(req.events).toHaveLength(2)
})

test('flushEvents failing does not generate events', () => {
  const config = {
    baseUrl: 'https://www.example.com',
    version: '123',
    systemName: 'test',
    userAgent: 'ua',
    publicKey: 'key',
  }
  const sessionId = 'asdf'
  const client = new CatalystWebReporter(config, sessionId)
  const mockFetch = vi.fn(() => Promise.resolve(Response.error()))
  window.fetch = mockFetch
  client.recordClick('a', 'a')
  vi.advanceTimersByTime(1000)

  expect(mockFetch).toHaveBeenCalledTimes(1)

  vi.advanceTimersByTime(3000)

  expect(mockFetch).toHaveBeenCalledTimes(1)
})

test('flushEvents populates metadata', async () => {
  const config = {
    baseUrl: 'https://www.example.com',
    version: '123',
    systemName: 'test',
    userAgent: 'ua',
    publicKey: 'key',
  }
  const sessionId = 'asdf'
  const client = new CatalystWebReporter(config, sessionId)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const mockFetch = vi.fn((url, data) => Promise.resolve(new Response()))
  window.fetch = mockFetch
  client.recordClick('a', 'a')
  vi.advanceTimersByTime(1000)

  const req = await extractRequest(mockFetch)

  expect(req.info).toStrictEqual(
    new FrontEndInfo({
      name: 'test',
      sessionId,
      userAgent: 'ua',
      version: '123',
    })
  )
  expect(mockFetch).toHaveBeenCalledTimes(1)
  expect(mockFetch.mock.calls[0][1].headers[PUBLIC_KEY_HEADER]).toBe('key')
})

test('recordPageView populates events with params', async () => {
  vi.setSystemTime(new Date(2023, 12, 25))
  const config = {
    baseUrl: 'https://www.example.com',
    version: '123',
    systemName: 'test',
    userAgent: 'ua',
    publicKey: 'key',
  }
  const sessionId = 'asdf'
  const client = new CatalystWebReporter(config, sessionId)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const mockFetch = vi.fn((url, data) => Promise.resolve(new Response()))
  window.fetch = mockFetch
  const recordTime = Timestamp.now()
  crypto.getRandomValues = vi.fn((a) => {
    a.fill(1)
    return a
  })
  client.recordPageView({
    rawPath: '/page/1/2',
    pathPattern: '/page/{test1}/{test2}',
    args: {
      test1: '1',
      test2: '2',
    },
  })
  vi.advanceTimersByTime(1000)

  const req = await extractRequest(mockFetch)

  expect(req.events).toStrictEqual([
    new SendFrontendEventsRequest_Event({
      event: {
        case: 'pageView',
        value: {
          time: recordTime,
          path: {
            pattern: '/page/{test1}/{test2}',
            rawPath: '/page/1/2',
            params: [
              {
                paramName: 'test1',
                argValue: '1',
              },
              {
                paramName: 'test2',
                argValue: '2',
              },
            ],
          },
        },
      },
      pageViewId: '0101010101010101',
    }),
  ])

  expect(mockFetch).toHaveBeenCalledTimes(1)
  expect(mockFetch.mock.calls[0][1].headers[PUBLIC_KEY_HEADER]).toBe('key')
})

test('recordPageView statefully changes pages', async () => {
  vi.setSystemTime(new Date(2023, 12, 25))
  const config = {
    baseUrl: 'https://www.example.com',
    version: '123',
    systemName: 'test',
    userAgent: 'ua',
    publicKey: 'key',
  }
  const sessionId = 'asdf'
  const client = new CatalystWebReporter(config, sessionId)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const mockFetch = vi.fn((url, data) => Promise.resolve(new Response()))
  window.fetch = mockFetch
  const recordTime = Timestamp.now()
  crypto.getRandomValues = <T extends ArrayBufferView | null>(a: T) => {
    if (a != null && 'fill' in a && typeof a.fill == 'function') {
      a.fill(1)
    }
    return a
  }
  client.recordPageView({
    pathPattern: '/page1',
    args: {},
    rawPath: '/page1',
  })
  client.recordClick('.select', 'text')
  crypto.getRandomValues = <T extends ArrayBufferView | null>(a: T) => {
    if (a != null && 'fill' in a && typeof a.fill == 'function') {
      a.fill(2)
    }
    return a
  }
  client.recordPageView({
    pathPattern: '/page2',
    args: {},
    rawPath: '/page2',
  })
  client.recordClick('.select', 'text')
  vi.advanceTimersByTime(1000)

  const req = await extractRequest(mockFetch)

  expect(req.events).toStrictEqual([
    new SendFrontendEventsRequest_Event({
      event: {
        case: 'pageView',
        value: {
          time: recordTime,
          path: {
            pattern: '/page1',
            rawPath: '/page1',
          },
        },
      },
      pageViewId: '0101010101010101',
    }),
    new SendFrontendEventsRequest_Event({
      event: {
        case: 'click',
        value: {
          buttonText: 'text',
          selector: '.select',
          id: '0101010101010101',
          time: recordTime,
        },
      },
      pageViewId: '0101010101010101',
    }),
    new SendFrontendEventsRequest_Event({
      event: {
        case: 'pageView',
        value: {
          time: recordTime,
          path: {
            pattern: '/page2',
            rawPath: '/page2',
          },
        },
      },
      pageViewId: '0202020202020202',
    }),
    new SendFrontendEventsRequest_Event({
      event: {
        case: 'click',
        value: {
          buttonText: 'text',
          selector: '.select',
          id: '0202020202020202',
          time: recordTime,
        },
      },
      pageViewId: '0202020202020202',
    }),
  ])

  expect(mockFetch).toHaveBeenCalledTimes(1)
  expect(mockFetch.mock.calls[0][1].headers[PUBLIC_KEY_HEADER]).toBe('key')
})

test('recordClick populates events while not on page', async () => {
  vi.setSystemTime(new Date(2023, 12, 25))
  const config = {
    baseUrl: 'https://www.example.com',
    version: '123',
    systemName: 'test',
    userAgent: 'ua',
    publicKey: 'key',
  }
  const sessionId = 'asdf'
  const client = new CatalystWebReporter(config, sessionId)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const mockFetch = vi.fn((url, data) => Promise.resolve(new Response()))
  window.fetch = mockFetch
  const recordTime = Timestamp.now()
  client.recordClick('.select', 'text')
  vi.advanceTimersByTime(1000)

  const req = await extractRequest(mockFetch)

  expect(req.events).toStrictEqual([
    new SendFrontendEventsRequest_Event({
      event: {
        case: 'click',
        value: {
          buttonText: 'text',
          selector: '.select',
          id: FAKE_RANDOM_ID,
          time: recordTime,
        },
      },
    }),
  ])

  expect(mockFetch).toHaveBeenCalledTimes(1)
  expect(mockFetch.mock.calls[0][1].headers[PUBLIC_KEY_HEADER]).toBe('key')
})

test('recordClick populates events while on page', async () => {
  vi.setSystemTime(new Date(2023, 12, 25))
  const config = {
    baseUrl: 'https://www.example.com',
    version: '123',
    systemName: 'test',
    userAgent: 'ua',
    publicKey: 'key',
  }
  const sessionId = 'asdf'
  const client = new CatalystWebReporter(config, sessionId)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const mockFetch = vi.fn((url, data) => Promise.resolve(new Response()))
  window.fetch = mockFetch
  const recordTime = Timestamp.now()
  client.recordPageView({
    rawPath: '/page',
    pathPattern: '/page',
    args: {},
  })
  client.recordClick('.select', 'text')
  vi.advanceTimersByTime(1000)

  const req = await extractRequest(mockFetch)

  expect(req.events).toStrictEqual([
    new SendFrontendEventsRequest_Event({
      event: {
        case: 'pageView',
        value: {
          time: recordTime,
          path: {
            pattern: '/page',
            rawPath: '/page',
          },
        },
      },
      pageViewId: FAKE_RANDOM_ID,
    }),
    new SendFrontendEventsRequest_Event({
      event: {
        case: 'click',
        value: {
          buttonText: 'text',
          selector: '.select',
          id: FAKE_RANDOM_ID,
          time: recordTime,
        },
      },
      pageViewId: FAKE_RANDOM_ID,
    }),
  ])
})

test('recordLog populates records string message with params', async () => {
  vi.setSystemTime(new Date(2023, 12, 25))
  const config = {
    baseUrl: 'https://www.example.com',
    version: '123',
    systemName: 'test',
    userAgent: 'ua',
    publicKey: 'key',
  }
  const sessionId = 'asdf'
  const client = new CatalystWebReporter(config, sessionId)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const mockFetch = vi.fn((url, data) => Promise.resolve(new Response()))
  window.fetch = mockFetch
  const recordTime = Timestamp.now()
  client.recordLog({
    severity: 'warn',
    message: 'test test',
    rawMessage: 'test test test:1 test2:"2"',
    args: {
      test: 1,
      test2: '2',
    },
  })
  vi.advanceTimersByTime(1000)

  const req = await extractRequest(mockFetch)

  expect(req.events).toStrictEqual([
    new SendFrontendEventsRequest_Event({
      event: {
        case: 'log',
        value: {
          id: FAKE_RANDOM_ID,
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
          rawMessage: 'test test test:1 test2:"2"',
          stackTrace: undefined,
          time: recordTime,
        },
      },
      pageViewId: undefined,
    }),
  ])

  expect(mockFetch).toHaveBeenCalledTimes(1)
  expect(mockFetch.mock.calls[0][1].headers[PUBLIC_KEY_HEADER]).toBe('key')
})

test('recordError populates records error message', async () => {
  vi.setSystemTime(new Date(2023, 12, 25))
  const config = {
    baseUrl: 'https://www.example.com',
    version: '123',
    systemName: 'test',
    userAgent: 'ua',
    publicKey: 'key',
  }
  const sessionId = 'asdf'
  const client = new CatalystWebReporter(config, sessionId)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const mockFetch = vi.fn((url, data) => Promise.resolve(new Response()))
  window.fetch = mockFetch
  const recordTime = Timestamp.now()
  const testErr = new Error('hello')
  client.recordError('error', testErr)
  vi.advanceTimersByTime(1000)

  const req = await extractRequest(mockFetch)

  expect(req.events).toStrictEqual([
    new SendFrontendEventsRequest_Event({
      event: {
        case: 'log',
        value: {
          id: FAKE_RANDOM_ID,
          logSeverity: LogSeverity.ERROR_LOG_SEVERITY,
          message: 'hello',
          rawMessage: 'hello',
          stackTrace: testErr.stack,
          time: recordTime,
        },
      },
      pageViewId: undefined,
    }),
  ])

  expect(mockFetch).toHaveBeenCalledTimes(1)
  expect(mockFetch.mock.calls[0][1].headers[PUBLIC_KEY_HEADER]).toBe('key')
})

test('recordLog populates events while on page', async () => {
  vi.setSystemTime(new Date(2023, 12, 25))
  const config = {
    baseUrl: 'https://www.example.com',
    version: '123',
    systemName: 'test',
    userAgent: 'ua',
    publicKey: 'key',
  }
  const sessionId = 'asdf'
  const client = new CatalystWebReporter(config, sessionId)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const mockFetch = vi.fn((url, data) => Promise.resolve(new Response()))
  window.fetch = mockFetch
  const recordTime = Timestamp.now()
  client.recordPageView({
    pathPattern: '/page',
    args: {},
    rawPath: '/page',
  })
  client.recordLog({
    severity: 'warn',
    message: 'text',
    rawMessage: 'text',
    args: {},
  })
  vi.advanceTimersByTime(1000)

  const req = await extractRequest(mockFetch)

  expect(req.events).toStrictEqual([
    new SendFrontendEventsRequest_Event({
      event: {
        case: 'pageView',
        value: {
          time: recordTime,
          path: {
            pattern: '/page',
            rawPath: '/page',
          },
        },
      },
      pageViewId: FAKE_RANDOM_ID,
    }),
    new SendFrontendEventsRequest_Event({
      event: {
        case: 'log',
        value: {
          id: FAKE_RANDOM_ID,
          logSeverity: LogSeverity.WARNING_LOG_SEVERITY,
          message: 'text',
          rawMessage: 'text',
          time: recordTime,
        },
      },
      pageViewId: FAKE_RANDOM_ID,
    }),
  ])
})

test('getFetchHeaders sends session ID', () => {
  const config = {
    baseUrl: 'https://www.example.com',
    version: '123',
    systemName: 'test',
    userAgent: 'ua',
    publicKey: 'key',
  }
  const sessionId = 'asdf'
  const client = new CatalystWebReporter(config, sessionId)

  expect(client.getFetchHeaders()).toStrictEqual({
    [SESSION_ID_HEADER]: 'asdf',
  })
})

test('getFetchHeaders sends current page view ID', () => {
  const config = {
    baseUrl: 'https://www.example.com',
    version: '123',
    systemName: 'test',
    userAgent: 'ua',
    publicKey: 'key',
  }
  const sessionId = 'asdf'
  const client = new CatalystWebReporter(config, sessionId)
  client.recordPageView({
    rawPath: '/test',
    args: {},
    pathPattern: '/test',
  })

  expect(client.getFetchHeaders()).toStrictEqual({
    [SESSION_ID_HEADER]: 'asdf',
    [PAGE_VIEW_ID_HEADER]: FAKE_RANDOM_ID,
  })
})

async function extractRequest(mockFn: Mock) {
  const body = mockFn.mock.calls[0][1].body
  return SendFrontendEventsRequest.fromBinary(new Uint8Array(body))
}
