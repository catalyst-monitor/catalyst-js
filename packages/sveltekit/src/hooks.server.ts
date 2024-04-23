import {
  catalystHandler,
  wrapCatalystFetchHandler,
  wrapCatalystServerErrorHandler,
  updateCatalystUserInfoContext,
  installNodeBase,
} from '$lib/server.js'
import { sequence } from '@sveltejs/kit/hooks'
import { COOKIE_NAME, getUserName } from './fakeAuth.server.js'
import type { Handle } from '@sveltejs/kit'

installNodeBase({
  privateKey: 'CqZNUYrUBaqcsacZCfSO/e4afBQ98WOqFdHQT7N6',
  systemName: 'catalyst-sveltekit-example',
  version: '0.0.1',
  baseUrl: 'http://localhost:7070',
})

export const handleError = wrapCatalystServerErrorHandler(({ error }) => {
  console.error(error)
})

export const handleFetch = wrapCatalystFetchHandler(['http://localhost:5174'])

const handleFakeAuth: Handle = async ({ event, resolve }) => {
  const resp = await resolve(event)

  const authToken = event.cookies.get(COOKIE_NAME)
  if (authToken != null) {
    const userName = getUserName(authToken)
    if (userName != null) {
      updateCatalystUserInfoContext({
        loggedInUserName: userName,
        loggedInId: authToken,
      })
    }
  }

  return resp
}

export const handle = sequence(catalystHandler, handleFakeAuth)
