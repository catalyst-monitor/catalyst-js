// @vitest-environment jsdom

import {
  vi,
  describe,
  test,
  beforeAll,
  afterAll,
  afterEach,
  expect,
  type MockInstance,
} from 'vitest'
import {
  COOKIE_NAME,
  PAGE_VIEW_ID_HEADER,
  SESSION_ID_HEADER,
} from './common.js'
import Catalyst from './index.js'

const config = {
  systemName: 'sys',
  version: '1',
}

const FAKE_RANDOM_ID = '0101010101010101'
const FAKE_RANDOM_SESSION_ID = '01010101010101010101010101010101'
const oldGetRandomValues = crypto.getRandomValues

beforeAll(() => {
  crypto.getRandomValues = vi.fn((a) => {
    a.fill(1)
    return a
  })
})

afterAll(() => {
  crypto.getRandomValues = oldGetRandomValues
})

describe('installWebBase cookies', () => {
  afterAll(() => {
    document.cookie = `${COOKIE_NAME}=; Max-Age=-9999999`
  })

  afterEach(() => {
    Catalyst.stop()
    window.console.log = window.console.__catalystOldLog!
    window.console.warn = window.console.__catalystOldWarn!
    window.console.error = window.console.__catalystOldError!
  })

  test('creates cookie if not exists', () => {
    document.cookie = `${COOKIE_NAME}=; Max-Age=-9999999`
    Catalyst.start(config)

    expect(Catalyst.getReporter().sessionId).toBe(FAKE_RANDOM_SESSION_ID)
    expect(document.cookie).toBe(`${COOKIE_NAME}=${FAKE_RANDOM_SESSION_ID}`)
  })

  test('re-uses cookie if it does exist', () => {
    document.cookie = `${COOKIE_NAME}=12345test12345; Expires=0`
    Catalyst.start(config)

    expect(Catalyst.getReporter().sessionId).toBe('12345test12345')
    expect(document.cookie).toBe(`${COOKIE_NAME}=12345test12345`)
  })
})

test("getCatalystWeb fails when installWebBase hasn't been called", () => {
  expect(() => {
    Catalyst.getReporter()
  }).toThrow(Error)
  expect(() => {
    Catalyst.getReporter()
  }).toThrow('Please call `Catalyst.start(...)` first!')
})

describe('web', () => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const mockFetch = vi.fn((_1, _2) => Promise.resolve(new Response()))
  let recordLogSpy: MockInstance
  let recordClickSpy: MockInstance
  let recordErrorSpy: MockInstance
  let oldWarnSpy: MockInstance
  let oldLogSpy: MockInstance
  let oldErrorSpy: MockInstance

  beforeAll(() => {
    window.fetch = mockFetch
    oldWarnSpy = vi.spyOn(console, 'warn')
    oldLogSpy = vi.spyOn(console, 'log')
    oldErrorSpy = vi.spyOn(console, 'error')
    document.cookie = `${COOKIE_NAME}=test123test123; Expires=0`
    // Install in beforeAll, because the instance was not meant
    // to be created and torn down multiple times, which makes
    // testing harder.
    Catalyst.start(config)
    const client = Catalyst.getReporter()
    client.recordPageView({
      pathPattern: '/test',
      rawPath: '/test',
      args: {},
    })
    recordLogSpy = vi.spyOn(client, 'recordLog')
    recordClickSpy = vi.spyOn(client, 'recordClick')
    recordErrorSpy = vi.spyOn(client, 'recordError')
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  afterAll(() => {
    Catalyst.stop()
  })

  test('installWebBase installs and installWebBase gets', () => {
    expect(Catalyst.getReporter().config).toStrictEqual(config)
  })

  test('installWebBase installs the console loggers', () => {
    expect(console.__catalystOldError).not.toBeNull()
    expect(console.__catalystOldWarn).not.toBeNull()
    expect(console.__catalystOldLog).not.toBeNull()
  })

  describe('installWebBase console functions creates events', () => {
    test('log', () => {
      console.log('hi1', 'hi2')

      expect(recordLogSpy).toHaveBeenCalled()
      expect(recordLogSpy.mock.calls[0]).toStrictEqual([
        {
          severity: 'info',
          message: 'hi1',
          rawMessage: 'hi1 hi2',
          args: { 1: 'hi2' },
        },
      ])
      expect(oldLogSpy).toHaveBeenCalled()
      expect(oldLogSpy.mock.calls[0]).toStrictEqual(['hi1', 'hi2'])
    })

    test('warn', () => {
      console.warn('warn1', 'warn2')

      expect(recordLogSpy).toHaveBeenCalled()
      expect(recordLogSpy.mock.calls[0]).toStrictEqual([
        {
          severity: 'warn',
          message: 'warn1',
          rawMessage: 'warn1 warn2',
          args: { 1: 'warn2' },
        },
      ])
      expect(oldWarnSpy).toHaveBeenCalled()
      expect(oldWarnSpy.mock.calls[0]).toStrictEqual(['warn1', 'warn2'])
    })

    test('error', () => {
      console.error('hi3')

      expect(recordLogSpy).toHaveBeenCalled()
      expect(recordLogSpy.mock.calls[0]).toStrictEqual([
        {
          severity: 'error',
          message: 'hi3',
          rawMessage: 'hi3',
          args: {},
        },
      ])
      expect(oldErrorSpy).toHaveBeenCalled()
      expect(oldErrorSpy.mock.calls[0]).toStrictEqual(['hi3'])
    })
  })

  test('installWebBase console functions handles errors', () => {
    const error = new Error('hi')
    console.error(error)

    expect(recordErrorSpy).toHaveBeenCalled()
    expect(recordErrorSpy.mock.calls[0]).toStrictEqual(['error', error])
    expect(oldErrorSpy).toHaveBeenCalled()
    expect(oldErrorSpy.mock.calls[0]).toStrictEqual([error])
  })

  test('installWebBase records uncaught errors', () => {
    const errorInstance = new Error('Test')
    window.dispatchEvent(
      new ErrorEvent('error', {
        error: errorInstance,
      })
    )

    expect(recordErrorSpy).toHaveBeenCalled()
    expect(recordErrorSpy.mock.calls[0]).toStrictEqual(['error', errorInstance])
  })

  // Doesn't seem to want to finish for some reason.
  test.skip('installWebBase records uncaught promise resolutions', () => {
    const errorInstance = new Error('Test')

    window.dispatchEvent(
      new PromiseRejectionEvent('unhandledrejection', {
        promise: Promise.reject(),
        reason: errorInstance,
      })
    )

    expect(recordErrorSpy).toHaveBeenCalled()
    expect(recordErrorSpy.mock.calls[0]).toStrictEqual(['error', errorInstance])
  })

  test('installWebBase records clicks', () => {
    window.document.body.innerHTML =
      '<div>Hello <button id="test1" class="test2 test3">Click me</button></div>'
    const el = window.document.body.querySelector('#test1') as HTMLElement
    el.click()

    expect(recordClickSpy).toHaveBeenCalled()
    expect(recordClickSpy.mock.calls[0]).toStrictEqual([
      'BUTTON#test1.test2.test3',
      'Click me',
    ])
  })

  test('installWebBase clicks truncates', () => {
    const buttonText = `${'a'.repeat(300)}\n`.repeat(3)
    window.document.body.innerHTML = `<div>Hello <button id="test1" class="test2 test3">${buttonText}</button></div>`
    const el = window.document.body.querySelector('#test1') as HTMLElement
    el.click()

    expect(recordClickSpy).toHaveBeenCalled()
    expect(recordClickSpy.mock.calls[0]).toStrictEqual([
      'BUTTON#test1.test2.test3',
      `${'a'.repeat(200)}...`,
    ])
  })

  test('fetch sends session ID', () => {
    window.fetch('https://test.com')

    expect(mockFetch.mock.calls).toHaveLength(1)
    expect(mockFetch.mock.calls[0]).toStrictEqual([
      'https://test.com',
      {
        headers: {
          [SESSION_ID_HEADER]: 'test123test123',
          [PAGE_VIEW_ID_HEADER]: FAKE_RANDOM_ID,
        },
      },
    ])
  })

  test('fetch sends session ID and page', () => {
    window.fetch('https://test.com')

    expect(mockFetch.mock.calls).toHaveLength(1)
    expect(mockFetch.mock.calls[0]).toStrictEqual([
      'https://test.com',
      {
        headers: {
          [SESSION_ID_HEADER]: 'test123test123',
          [PAGE_VIEW_ID_HEADER]: FAKE_RANDOM_ID,
        },
      },
    ])
  })

  test('fetch accepts all signature of fetch', () => {
    window.fetch('https://test.com')
    window.fetch('https://test.com', {
      method: 'put',
      headers: { 'x-test': '1' },
    })
    window.fetch(
      new Request('https://test.com', {
        method: 'put',
        headers: { 'x-test': '1' },
      })
    )

    expect(mockFetch.mock.calls).toHaveLength(3)
    expect(mockFetch.mock.calls[0]).toStrictEqual([
      'https://test.com',
      {
        headers: {
          [SESSION_ID_HEADER]: 'test123test123',
          [PAGE_VIEW_ID_HEADER]: FAKE_RANDOM_ID,
        },
      },
    ])
    expect(mockFetch.mock.calls[1]).toStrictEqual([
      'https://test.com',
      {
        method: 'put',
        headers: {
          'x-test': '1',
          [SESSION_ID_HEADER]: 'test123test123',
          [PAGE_VIEW_ID_HEADER]: FAKE_RANDOM_ID,
        },
      },
    ])
    expect(mockFetch.mock.calls[2]).toStrictEqual([
      new Request('https://test.com', {
        method: 'put',
        headers: { 'x-test': '1' },
      }),
      {
        headers: {
          [SESSION_ID_HEADER]: 'test123test123',
          [PAGE_VIEW_ID_HEADER]: FAKE_RANDOM_ID,
        },
      },
    ])
  })
})
