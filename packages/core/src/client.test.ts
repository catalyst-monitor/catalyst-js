/**
 * @jest-environment jsdom
 */

// JSDom Jest Polyfills
import { TextEncoder, TextDecoder } from 'util'
Object.assign(globalThis, { TextDecoder, TextEncoder })
crypto.randomUUID = () => '1111-1111-1111-1111-1111'

import { CatalystClient } from './client'
import { FrontEndInfo, SendFrontendEventsRequest } from './gen/library_pb'
import { PUBLIC_KEY_HEADER } from './common'

jest.useFakeTimers()

afterEach(() => {
  jest.restoreAllMocks()
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

async function extractRequest(mockFn: jest.Mock) {
  const body = mockFn.mock.calls[0][1].body
  return SendFrontendEventsRequest.fromBinary(new Uint8Array(body))
}
