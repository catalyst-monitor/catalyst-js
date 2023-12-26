/**
 * @jest-environment ../../../jest.fixjsdom.ts
 */

import { COOKIE_NAME, PAGE_VIEW_ID_HEADER, SESSION_ID_HEADER } from './common'
import { catalystWebFetch, getCatalystWeb, installWebBase } from './web'

const config = {
  systemName: 'sys',
  version: '1',
}

describe('installWebBase cookies', () => {
  const randomUuidVal = '123-123-123-123-123'
  const oldRandomUuid = crypto.randomUUID

  beforeAll(() => {
    crypto.randomUUID = () => randomUuidVal
  })

  afterAll(() => {
    crypto.randomUUID = oldRandomUuid
    document.cookie = `${COOKIE_NAME}=; Max-Age=-9999999`
  })

  afterEach(() => {
    window.__catalystWebInstance = undefined
    window.console.log = window.console.__catalystOldLog!
    window.console.warn = window.console.__catalystOldWarn!
    window.console.error = window.console.__catalystOldError!
  })

  test('creates cookie if not exists', () => {
    document.cookie = `${COOKIE_NAME}=; Max-Age=-9999999`
    installWebBase(config)

    expect(getCatalystWeb().sessionId).toBe(randomUuidVal)
    expect(document.cookie).toBe(`${COOKIE_NAME}=${randomUuidVal}`)
  })

  test('re-uses cookie if it does exist', () => {
    document.cookie = `${COOKIE_NAME}=12345test12345; Expires=0`
    installWebBase(config)

    expect(getCatalystWeb().sessionId).toBe('12345test12345')
    expect(document.cookie).toBe(`${COOKIE_NAME}=12345test12345`)
  })
})

test("getCatalystWeb fails when installWebBase hasn't been called", () => {
  expect(() => {
    getCatalystWeb()
  }).toThrow(Error)
  expect(() => {
    getCatalystWeb()
  }).toThrow(
    'Catalyst has not been instantiated yet! Try running "installWebBase" first!'
  )
})

describe('web', () => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const mockFetch = jest.fn((_1, _2) => Promise.resolve(new Response()))
  let recordLogSpy: jest.SpyInstance
  let recordClickSpy: jest.SpyInstance
  let oldWarnSpy: jest.SpyInstance
  let oldLogSpy: jest.SpyInstance
  let oldErrorSpy: jest.SpyInstance

  beforeAll(() => {
    global.fetch = mockFetch
    oldWarnSpy = jest.spyOn(console, 'warn')
    oldLogSpy = jest.spyOn(console, 'log')
    oldErrorSpy = jest.spyOn(console, 'error')
    document.cookie = `${COOKIE_NAME}=test123test123; Expires=0`
    // Install in beforeAll, because the instance was not meant
    // to be created and torn down multiple times, which makes
    // testing harder.
    const client = installWebBase(config)
    client.recordPageView('/test', {})
    recordLogSpy = jest.spyOn(client, 'recordLog')
    recordClickSpy = jest.spyOn(client, 'recordClick')
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  afterAll(() => {
    global.__catalystNodeInstance?.destroy()
    global.__catalystNodeInstance = undefined
  })

  test('installNodeBase installs and getCatalystNode gets', () => {
    expect(getCatalystWeb().config).toStrictEqual(config)
  })

  test('installWebBase installs the console loggers', () => {
    expect(console.__catalystOldError).not.toBeNull()
    expect(console.__catalystOldWarn).not.toBeNull()
    expect(console.__catalystOldLog).not.toBeNull()
  })

  test('installWebBase console functions creates events', () => {
    console.log('hi1', 'hi2')

    expect(recordLogSpy).toHaveBeenCalled()
    expect(recordLogSpy.mock.calls[0]).toStrictEqual([
      'info',
      'hi1',
      { 1: 'hi2' },
    ])
    expect(oldLogSpy).toHaveBeenCalled()
    expect(oldLogSpy.mock.calls[0]).toStrictEqual(['hi1', 'hi2'])

    jest.resetAllMocks()

    console.warn('warn1', 'warn2')

    expect(recordLogSpy).toHaveBeenCalled()
    expect(recordLogSpy.mock.calls[0]).toStrictEqual([
      'warn',
      'warn1',
      { 1: 'warn2' },
    ])
    expect(oldWarnSpy).toHaveBeenCalled()
    expect(oldWarnSpy.mock.calls[0]).toStrictEqual(['warn1', 'warn2'])

    jest.resetAllMocks()
    console.error('hi3')

    expect(recordLogSpy).toHaveBeenCalled()
    expect(recordLogSpy.mock.calls[0]).toStrictEqual(['error', 'hi3', {}])
    expect(oldErrorSpy).toHaveBeenCalled()
    expect(oldErrorSpy.mock.calls[0]).toStrictEqual(['hi3'])
  })

  test('installWebBase records uncaught errors', () => {
    const errorInstance = new Error('Test')
    window.dispatchEvent(
      new ErrorEvent('error', {
        error: errorInstance,
      })
    )

    expect(recordLogSpy).toHaveBeenCalled()
    expect(recordLogSpy.mock.calls[0]).toStrictEqual([
      'error',
      errorInstance,
      {},
    ])
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

    expect(recordLogSpy).toHaveBeenCalled()
    expect(recordLogSpy.mock.calls[0]).toStrictEqual([
      'error',
      errorInstance,
      {},
    ])
  })

  test('installWebBase records clicks', () => {
    window.document.body.innerHTML =
      '<div>Hello <button id="test1" class="test2 test3">Click me</button></div>'
    const el = window.document.body.querySelector('#test1') as HTMLElement
    console.debug('CLICK')
    el.click()

    console.debug('CHECK')
    expect(recordClickSpy).toHaveBeenCalled()
    expect(recordClickSpy.mock.calls[0]).toStrictEqual([
      'BUTTON#test1.test2.test3',
      'Click me',
    ])
  })

  test('catalystWebFetch sends session ID', () => {
    catalystWebFetch('https://test.com')

    expect(mockFetch.mock.calls).toHaveLength(1)
    expect(mockFetch.mock.calls[0]).toStrictEqual([
      'https://test.com',
      {
        headers: {
          [SESSION_ID_HEADER]: 'test123test123',
          [PAGE_VIEW_ID_HEADER]: crypto.randomUUID(),
        },
      },
    ])
  })

  test('catalystWebFetch sends session ID and page', () => {
    catalystWebFetch('https://test.com')

    expect(mockFetch.mock.calls).toHaveLength(1)
    expect(mockFetch.mock.calls[0]).toStrictEqual([
      'https://test.com',
      {
        headers: {
          [SESSION_ID_HEADER]: 'test123test123',
          [PAGE_VIEW_ID_HEADER]: crypto.randomUUID(),
        },
      },
    ])
  })

  test('catalystWebFetch accepts all signature of fetch', () => {
    catalystWebFetch('https://test.com')
    catalystWebFetch('https://test.com', {
      method: 'put',
      headers: { 'x-test': '1' },
    })
    catalystWebFetch(
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
          [PAGE_VIEW_ID_HEADER]: crypto.randomUUID(),
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
          [PAGE_VIEW_ID_HEADER]: crypto.randomUUID(),
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
          [PAGE_VIEW_ID_HEADER]: crypto.randomUUID(),
        },
      },
    ])
  })
})

// Polyfill required for Jest
// https://github.com/jsdom/jsdom/issues/2401
class PromiseRejectionEvent<T> extends Event {
  public readonly promise: Promise<T>
  public readonly reason: T

  public constructor(
    type: 'unhandledrejection',
    options: { promise: Promise<T>; reason: T }
  ) {
    super(type)

    this.promise = options.promise
    this.reason = options.reason
  }
}
