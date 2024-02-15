import {
  createCatalystContext,
  getCatalystContext,
  updateCatalystContext,
} from './async_hooks.js'

test('getCatalystContext gets context', () => {
  const val = {
    fetchId: '1',
    sessionId: '2',
    loggedInEmail: '3',
    loggedInId: '4',
    pageViewId: '5',
    parentFetchId: '6',
  }
  createCatalystContext(val, () => {
    expect(getCatalystContext()).toBe(val)
  })
})

test('getCatalystContext with no context returns undefined', () => {
  expect(getCatalystContext()).toBeUndefined()
})

test('updateCatalystContext updates value in store', () => {
  const val = {
    fetchId: '1',
    sessionId: '2',
    loggedInEmail: '3',
    loggedInId: '4',
    pageViewId: '5',
    parentFetchId: '6',
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
