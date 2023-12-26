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
  const client = new CatalystServer(config, sessionId)
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
