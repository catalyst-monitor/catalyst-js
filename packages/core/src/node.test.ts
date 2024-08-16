import type { MockInstance } from 'vitest'
import { createCatalystContext } from './async_hooks.js'
import { PARENT_FETCH_ID_HEADER, SESSION_ID_HEADER } from './common.js'
import { catalystNodeFetch, getCatalystNode, installNodeBase } from './node.js'

const config = {
  privateKey: 'key',
  systemName: 'sys',
  version: '1',
  baseUrl: 'https://test.com',
}

describe('with installNodeBase called', () => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const mockFetch = vitest.fn((_1, _2) => Promise.resolve(new Response()))
  let recordLogSpy: MockInstance
  let recordErrorSpy: MockInstance
  let oldWarnSpy: MockInstance
  let oldLogSpy: MockInstance
  let oldErrorSpy: MockInstance

  beforeAll(() => {
    global.fetch = mockFetch
    oldWarnSpy = vitest.spyOn(console, 'warn')
    oldLogSpy = vitest.spyOn(console, 'log')
    oldErrorSpy = vitest.spyOn(console, 'error')
    // Install in beforeAll, because the instance was not meant
    // to be created and torn down multiple times, which makes
    // testing harder.
    installNodeBase(config)
    recordLogSpy = vitest.spyOn(global.__catalystNodeInstance!, 'recordLog')
    recordErrorSpy = vitest.spyOn(global.__catalystNodeInstance!, 'recordError')
  })

  afterEach(() => {
    vitest.resetAllMocks()
  })

  afterAll(() => {
    global.__catalystNodeInstance?.destroy()
    global.__catalystNodeInstance = undefined
  })

  test('installNodeBase installs and getCatalystNode gets', () => {
    expect(getCatalystNode().config).toStrictEqual(config)
  })

  test('installNodeBase installs the console loggers', () => {
    expect(console.__catalystOldError).not.toBeNull()
    expect(console.__catalystOldWarn).not.toBeNull()
    expect(console.__catalystOldLog).not.toBeNull()
  })

  describe('installNodeBase console functions installed correctly', () => {
    const ctx = {
      context: {
        fetchId: '1',
        sessionId: '2',
      },
    }

    test('log', () => {
      createCatalystContext(ctx, () => {
        console.log('hi1', 'hi2')
      })

      expect(recordLogSpy).toHaveBeenCalled()
      expect(recordLogSpy.mock.calls[0]).toStrictEqual([
        {
          severity: 'info',
          message: 'hi1',
          rawMessage: 'hi1 hi2',
          args: { 1: 'hi2' },
        },
        ctx.context,
      ])
      expect(oldLogSpy).toHaveBeenCalled()
      expect(oldLogSpy.mock.calls[0]).toStrictEqual(['hi1', 'hi2'])
    })

    test('warn', () => {
      createCatalystContext(ctx, () => {
        console.warn('warn1', 'warn2')
      })

      expect(recordLogSpy).toHaveBeenCalled()
      expect(recordLogSpy.mock.calls[0]).toStrictEqual([
        {
          severity: 'warn',
          message: 'warn1',
          rawMessage: 'warn1 warn2',
          args: { 1: 'warn2' },
        },
        ctx.context,
      ])
      expect(oldWarnSpy).toHaveBeenCalled()
      expect(oldWarnSpy.mock.calls[0]).toStrictEqual(['warn1', 'warn2'])
    })

    test('error', () => {
      createCatalystContext(ctx, () => {
        console.error('hi3')
      })

      expect(recordLogSpy).toHaveBeenCalled()
      expect(recordLogSpy.mock.calls[0]).toStrictEqual([
        { severity: 'error', message: 'hi3', rawMessage: 'hi3', args: {} },
        ctx.context,
      ])
      expect(oldErrorSpy).toHaveBeenCalled()
      expect(oldErrorSpy.mock.calls[0]).toStrictEqual(['hi3'])
    })
  })

  test('installNodeBase console functions handles no context', () => {
    console.log('test no context', 'hi1')

    expect(recordLogSpy).toHaveBeenCalled()
    expect(recordLogSpy.mock.calls[0]).toStrictEqual([
      {
        severity: 'info',
        message: 'test no context',
        rawMessage: 'test no context hi1',
        args: { 1: 'hi1' },
      },
      undefined,
    ])
    expect(oldLogSpy).toHaveBeenCalled()
    expect(oldLogSpy.mock.calls[0]).toStrictEqual(['test no context', 'hi1'])
  })

  test('installNodeBase console functions handles errors', () => {
    const error = new Error('hi')
    console.log(error)

    expect(recordErrorSpy).toHaveBeenCalled()
    expect(recordErrorSpy.mock.calls[0]).toStrictEqual([
      'info',
      error,
      undefined,
    ])
    expect(oldLogSpy).toHaveBeenCalled()
    expect(oldLogSpy.mock.calls[0]).toStrictEqual([error])
  })

  test('catalystNodeFetch uses context', () => {
    const val = {
      context: {
        fetchId: '1',
        sessionId: '2',
        loggedInEmail: '3',
        loggedInId: '4',
        pageViewId: '5',
        parentFetchId: '6',
      },
    }
    createCatalystContext(val, () => {
      catalystNodeFetch('https://test.com')
    })

    expect(mockFetch.mock.calls).toHaveLength(1)
    expect(mockFetch.mock.calls[0]).toStrictEqual([
      'https://test.com',
      {
        headers: {
          [SESSION_ID_HEADER]: '2',
          [PARENT_FETCH_ID_HEADER]: '1',
        },
      },
    ])
  })

  test('catalystNodeFetch fails when not given context', () => {
    expect(() => catalystNodeFetch('https://test.com')).toThrow(Error)
    expect(() => catalystNodeFetch('https://test.com')).toThrow(
      'Tried to fetch without context!'
    )
  })

  test('catalystNodeFetch accepts all signature of fetch', () => {
    const val = {
      context: {
        fetchId: '1',
        sessionId: '2',
      },
    }
    createCatalystContext(val, () => {
      catalystNodeFetch('https://test.com')
      catalystNodeFetch('https://test.com', {
        method: 'put',
        headers: { 'x-test': '1' },
      })
      catalystNodeFetch(
        new Request('https://test.com', {
          method: 'put',
          headers: { 'x-test': '1' },
        })
      )
    })

    expect(mockFetch.mock.calls).toHaveLength(3)
    expect(mockFetch.mock.calls[0]).toStrictEqual([
      'https://test.com',
      {
        headers: {
          [SESSION_ID_HEADER]: '2',
          [PARENT_FETCH_ID_HEADER]: '1',
        },
      },
    ])
    expect(mockFetch.mock.calls[1]).toStrictEqual([
      'https://test.com',
      {
        method: 'put',
        headers: {
          'x-test': '1',
          [SESSION_ID_HEADER]: '2',
          [PARENT_FETCH_ID_HEADER]: '1',
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
          [SESSION_ID_HEADER]: '2',
          [PARENT_FETCH_ID_HEADER]: '1',
        },
      },
    ])
  })
})

test("getCatalystNode fails when installNodeBase hasn't been called", () => {
  expect(() => {
    getCatalystNode()
  }).toThrow(Error)
  expect(() => {
    getCatalystNode()
  }).toThrow(
    'Catalyst has not been instantiated yet! Try running "installNodeBase" first!'
  )
})
