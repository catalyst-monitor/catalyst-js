import { Catalyst, catalystClientErrorHandler } from '$lib/client.js'
import {
  PUBLIC_CATALYST_SYSTEM_NAME,
  PUBLIC_CATALYST_VERSION,
  PUBLIC_CATALYST_PUBLIC_KEY,
} from '$env/static/public'

Catalyst.start({
  systemName: `${PUBLIC_CATALYST_SYSTEM_NAME}-fe`,
  version: PUBLIC_CATALYST_VERSION,
  publicKey: PUBLIC_CATALYST_PUBLIC_KEY,
  userAgent: window.navigator.userAgent,
  baseUrl: 'http://localhost:7070',
})

export const handleError = catalystClientErrorHandler(() => {})
