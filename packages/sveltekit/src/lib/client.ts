export * from '@catalyst-monitor/core/web'
import { getCatalystWeb } from '@catalyst-monitor/core/web'
import type { HandleClientError } from '@sveltejs/kit'

export function catalystClientErrorHandler(
  errorHandler: HandleClientError
): HandleClientError {
  return (input) => {
    const { error, status } = input
    getCatalystWeb().recordLog('error', error, { status })
    errorHandler(input)
  }
}
