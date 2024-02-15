import { catalystClientErrorHandler } from '$lib/client.js'
import { installWebBase } from '@catalyst-monitor/core/web'

installWebBase({
  systemName: 'catalyst-sveltekit-example-fe',
  version: '0.0.1',
  publicKey: 'UsHtftJZKdkF9WZ7DT4HSWQk08QHwZiUwEwab8wd',
  userAgent: window.navigator.userAgent,
  baseUrl: 'http://localhost:7070',
})

export const handleError = catalystClientErrorHandler(() => {})
