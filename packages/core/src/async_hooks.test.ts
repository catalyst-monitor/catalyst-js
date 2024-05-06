import {
  createCatalystContext,
  getCatalystContext,
  updateCatalystContext,
  updateCatalystUserInfoContext,
} from './async_hooks.js'

test('getCatalystContext gets context', () => {
  const val = {
    context: {
      fetchId: '1',
      sessionId: '2',
      loggedInUserName: '3',
      loggedInId: '4',
      pageViewId: '5',
      parentFetchId: '6',
    },
  }
  createCatalystContext(val, () => {
    expect(getCatalystContext()).toBe(val.context)
  })
})

test('getCatalystContext with no context returns undefined', () => {
  expect(getCatalystContext()).toBeUndefined()
})

test('updateCatalystContext updates value in store', () => {
  const val = {
    context: {
      fetchId: '1',
      sessionId: '2',
      loggedInUserName: '3',
      loggedInId: '4',
      pageViewId: '5',
      parentFetchId: '6',
    },
  }
  const newVal = {
    fetchId: '5',
    sessionId: '7',
  }
  createCatalystContext(val, () => {
    updateCatalystContext(newVal)
    expect(getCatalystContext()).toBe(newVal)
  })
})

test('updateCatalystUserInfoContext updates login values in store', () => {
  const val = {
    context: {
      fetchId: '1',
      sessionId: '2',
      loggedInUserName: '3',
      loggedInId: '4',
      pageViewId: '5',
      parentFetchId: '6',
    },
  }
  const newVal = {
    loggedInUserName: '123',
    loggedInId: 'abc',
  }
  createCatalystContext(val, () => {
    updateCatalystUserInfoContext(newVal)
    expect(getCatalystContext()).toStrictEqual({
      fetchId: '1',
      sessionId: '2',
      loggedInUserName: '123',
      loggedInId: 'abc',
      pageViewId: '5',
      parentFetchId: '6',
    })
  })
})

test('updateCatalystUserInfoContext accepts null login', () => {
  const val = {
    context: {
      fetchId: '1',
      sessionId: '2',
      loggedInUserName: '3',
      loggedInId: '4',
      pageViewId: '5',
      parentFetchId: '6',
    },
  }
  createCatalystContext(val, () => {
    updateCatalystUserInfoContext(null)
    expect(getCatalystContext()).toStrictEqual({
      fetchId: '1',
      sessionId: '2',
      loggedInUserName: undefined,
      loggedInId: undefined,
      pageViewId: '5',
      parentFetchId: '6',
    })
  })
})

test('updateCatalystUserInfoContext does not fail when no existing context', () => {
  updateCatalystUserInfoContext({
    loggedInUserName: '123',
    loggedInId: 'abc',
  })
  expect(getCatalystContext()).toBe(undefined)
})
