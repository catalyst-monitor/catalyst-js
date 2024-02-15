import {
  catalystHandler,
  wrapCatalystFetchHandler,
  wrapCatalystServerErrorHandler,
} from '$lib/server.js'
import { installNodeBase } from '@catalyst-monitor/core/node'

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

export const handle = catalystHandler
