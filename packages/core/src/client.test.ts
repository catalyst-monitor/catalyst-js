/**
 * @jest-environment ../../../jest.fixjsdom.ts
 */

import { CatalystClient } from './client.js'
import {
  FrontEndInfo,
  LogSeverity,
  SendFrontendEventsRequest,
  SendFrontendEventsRequest_Event,
} from './gen/library_pb.js'
import {
  PAGE_VIEW_ID_HEADER,
  PUBLIC_KEY_HEADER,
  SESSION_ID_HEADER,
} from './common.js'
import { Timestamp } from '@bufbuild/protobuf'

jest.useFakeTimers()

afterEach(() => {
  jest.restoreAllMocks()
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
  const client = new CatalystClient(config, sessionId)
  const mockFetch = jest.fn(() => Promise.resolve(new Response()))
  window.fetch = mockFetch

  client.recordClick('a', 'a')
  jest.advanceTimersByTime(1000)

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
  const client = new CatalystClient(config, sessionId)
  const mockFetch = jest.fn(() => Promise.resolve(new Response()))
  window.fetch = mockFetch
  jest.advanceTimersByTime(1000)

  expect(mockFetch).not.toHaveBeenCalled()

  client.recordClick('a', 'a')
  client.recordClick('a', 'a')
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
    userAgent: 'ua',
    publicKey: 'key',
  }
  const sessionId = 'asdf'
  const client = new CatalystClient(config, sessionId)
  const mockFetch = jest.fn(() => Promise.resolve(Response.error()))
  window.fetch = mockFetch
  client.recordClick('a', 'a')
  jest.advanceTimersByTime(1000)

  expect(mockFetch).toHaveBeenCalledTimes(1)

  jest.advanceTimersByTime(3000)

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
  const client = new CatalystClient(config, sessionId)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const mockFetch = jest.fn((url, data) => Promise.resolve(new Response()))
  window.fetch = mockFetch
  client.recordClick('a', 'a')
  jest.advanceTimersByTime(1000)

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
  jest.setSystemTime(new Date(2023, 12, 25))
  const config = {
    baseUrl: 'https://www.example.com',
    version: '123',
    systemName: 'test',
    userAgent: 'ua',
    publicKey: 'key',
  }
  const sessionId = 'asdf'
  const client = new CatalystClient(config, sessionId)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const mockFetch = jest.fn((url, data) => Promise.resolve(new Response()))
  window.fetch = mockFetch
  const recordTime = Timestamp.now()
  client.recordPageView({
    rawPath: '/page/1/2',
    pathPattern: '/page/{test1}/{test2}',
    args: {
      test1: '1',
      test2: '2',
    },
  })
  jest.advanceTimersByTime(1000)

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
      pageViewId: crypto.randomUUID(),
    }),
  ])

  expect(mockFetch).toHaveBeenCalledTimes(1)
  expect(mockFetch.mock.calls[0][1].headers[PUBLIC_KEY_HEADER]).toBe('key')
})

test('recordPageView statefully changes pages', async () => {
  jest.setSystemTime(new Date(2023, 12, 25))
  const config = {
    baseUrl: 'https://www.example.com',
    version: '123',
    systemName: 'test',
    userAgent: 'ua',
    publicKey: 'key',
  }
  const sessionId = 'asdf'
  const client = new CatalystClient(config, sessionId)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const mockFetch = jest.fn((url, data) => Promise.resolve(new Response()))
  window.fetch = mockFetch
  const recordTime = Timestamp.now()
  crypto.randomUUID = () => '1-1-1-1-1'
  client.recordPageView({
    pathPattern: '/page1',
    args: {},
    rawPath: '/page1',
  })
  client.recordClick('.select', 'text')
  crypto.randomUUID = () => '2-2-2-2-2'
  client.recordPageView({
    pathPattern: '/page2',
    args: {},
    rawPath: '/page2',
  })
  client.recordClick('.select', 'text')
  jest.advanceTimersByTime(1000)

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
      pageViewId: '1-1-1-1-1',
    }),
    new SendFrontendEventsRequest_Event({
      event: {
        case: 'click',
        value: {
          buttonText: 'text',
          selector: '.select',
          id: '1-1-1-1-1',
          time: recordTime,
        },
      },
      pageViewId: '1-1-1-1-1',
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
      pageViewId: '2-2-2-2-2',
    }),
    new SendFrontendEventsRequest_Event({
      event: {
        case: 'click',
        value: {
          buttonText: 'text',
          selector: '.select',
          id: '2-2-2-2-2',
          time: recordTime,
        },
      },
      pageViewId: '2-2-2-2-2',
    }),
  ])

  expect(mockFetch).toHaveBeenCalledTimes(1)
  expect(mockFetch.mock.calls[0][1].headers[PUBLIC_KEY_HEADER]).toBe('key')
})

test('recordClick populates events while not on page', async () => {
  jest.setSystemTime(new Date(2023, 12, 25))
  const config = {
    baseUrl: 'https://www.example.com',
    version: '123',
    systemName: 'test',
    userAgent: 'ua',
    publicKey: 'key',
  }
  const sessionId = 'asdf'
  const client = new CatalystClient(config, sessionId)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const mockFetch = jest.fn((url, data) => Promise.resolve(new Response()))
  window.fetch = mockFetch
  const recordTime = Timestamp.now()
  client.recordClick('.select', 'text')
  jest.advanceTimersByTime(1000)

  const req = await extractRequest(mockFetch)

  expect(req.events).toStrictEqual([
    new SendFrontendEventsRequest_Event({
      event: {
        case: 'click',
        value: {
          buttonText: 'text',
          selector: '.select',
          id: crypto.randomUUID(),
          time: recordTime,
        },
      },
    }),
  ])

  expect(mockFetch).toHaveBeenCalledTimes(1)
  expect(mockFetch.mock.calls[0][1].headers[PUBLIC_KEY_HEADER]).toBe('key')
})

test('recordClick populates events while on page', async () => {
  jest.setSystemTime(new Date(2023, 12, 25))
  const config = {
    baseUrl: 'https://www.example.com',
    version: '123',
    systemName: 'test',
    userAgent: 'ua',
    publicKey: 'key',
  }
  const sessionId = 'asdf'
  const client = new CatalystClient(config, sessionId)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const mockFetch = jest.fn((url, data) => Promise.resolve(new Response()))
  window.fetch = mockFetch
  const recordTime = Timestamp.now()
  client.recordPageView({
    rawPath: '/page',
    pathPattern: '/page',
    args: {},
  })
  client.recordClick('.select', 'text')
  jest.advanceTimersByTime(1000)

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
      pageViewId: crypto.randomUUID(),
    }),
    new SendFrontendEventsRequest_Event({
      event: {
        case: 'click',
        value: {
          buttonText: 'text',
          selector: '.select',
          id: crypto.randomUUID(),
          time: recordTime,
        },
      },
      pageViewId: crypto.randomUUID(),
    }),
  ])
})

test('recordLog populates records string message with params', async () => {
  jest.setSystemTime(new Date(2023, 12, 25))
  const config = {
    baseUrl: 'https://www.example.com',
    version: '123',
    systemName: 'test',
    userAgent: 'ua',
    publicKey: 'key',
  }
  const sessionId = 'asdf'
  const client = new CatalystClient(config, sessionId)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const mockFetch = jest.fn((url, data) => Promise.resolve(new Response()))
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
  jest.advanceTimersByTime(1000)

  const req = await extractRequest(mockFetch)

  expect(req.events).toStrictEqual([
    new SendFrontendEventsRequest_Event({
      event: {
        case: 'log',
        value: {
          id: crypto.randomUUID(),
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
  jest.setSystemTime(new Date(2023, 12, 25))
  const config = {
    baseUrl: 'https://www.example.com',
    version: '123',
    systemName: 'test',
    userAgent: 'ua',
    publicKey: 'key',
  }
  const sessionId = 'asdf'
  const client = new CatalystClient(config, sessionId)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const mockFetch = jest.fn((url, data) => Promise.resolve(new Response()))
  window.fetch = mockFetch
  const recordTime = Timestamp.now()
  const testErr = new Error('hello')
  client.recordError('error', testErr)
  jest.advanceTimersByTime(1000)

  const req = await extractRequest(mockFetch)

  expect(req.events).toStrictEqual([
    new SendFrontendEventsRequest_Event({
      event: {
        case: 'log',
        value: {
          id: crypto.randomUUID(),
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
  jest.setSystemTime(new Date(2023, 12, 25))
  const config = {
    baseUrl: 'https://www.example.com',
    version: '123',
    systemName: 'test',
    userAgent: 'ua',
    publicKey: 'key',
  }
  const sessionId = 'asdf'
  const client = new CatalystClient(config, sessionId)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const mockFetch = jest.fn((url, data) => Promise.resolve(new Response()))
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
  jest.advanceTimersByTime(1000)

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
      pageViewId: crypto.randomUUID(),
    }),
    new SendFrontendEventsRequest_Event({
      event: {
        case: 'log',
        value: {
          id: crypto.randomUUID(),
          logSeverity: LogSeverity.WARNING_LOG_SEVERITY,
          message: 'text',
          rawMessage: 'text',
          time: recordTime,
        },
      },
      pageViewId: crypto.randomUUID(),
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
  const client = new CatalystClient(config, sessionId)

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
  const client = new CatalystClient(config, sessionId)
  client.recordPageView({
    rawPath: '/test',
    args: {},
    pathPattern: '/test',
  })

  expect(client.getFetchHeaders()).toStrictEqual({
    [SESSION_ID_HEADER]: 'asdf',
    [PAGE_VIEW_ID_HEADER]: crypto.randomUUID(),
  })
})

async function extractRequest(mockFn: jest.Mock) {
  const body = mockFn.mock.calls[0][1].body
  return SendFrontendEventsRequest.fromBinary(new Uint8Array(body))
}
