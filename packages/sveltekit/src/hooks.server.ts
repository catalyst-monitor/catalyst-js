import {
  catalystHandler,
  wrapCatalystFetchHandler,
  wrapCatalystServerErrorHandler,
  Catalyst,
} from '$lib/server.js'
import { sequence } from '@sveltejs/kit/hooks'
import { COOKIE_NAME, getUserName } from './fakeAuth.server.js'
import type { Handle } from '@sveltejs/kit'
import {
  PUBLIC_CATALYST_SYSTEM_NAME,
  PUBLIC_CATALYST_VERSION,
} from '$env/static/public'
import { CATALYST_PRIVATE_KEY } from '$env/static/private'

Catalyst.start({
  privateKey: CATALYST_PRIVATE_KEY,
  systemName: PUBLIC_CATALYST_SYSTEM_NAME,
  version: PUBLIC_CATALYST_VERSION,
  baseUrl: 'http://localhost:4173',
  propagateHosts: ['http://localhost:5174'],
})

export const handleError = wrapCatalystServerErrorHandler(({ error }) => {
  console.error(error)
})

export const handleFetch = wrapCatalystFetchHandler()

const handleFakeAuth: Handle = async ({ event, resolve }) => {
  const resp = await resolve(event)

  const authToken = event.cookies.get(COOKIE_NAME)
  if (authToken != null) {
    const userName = getUserName(authToken)
    if (userName != null) {
      Catalyst.getReporter().setLoggedInUserInfo({
        loggedInName: userName,
        loggedInId: authToken,
      })
    }
  }

  return resp
}

export const handle = sequence(catalystHandler, handleFakeAuth)
