export * from '@catalyst-monitor/core/web'
import { getCatalystWeb } from '@catalyst-monitor/core/web'
import type { HandleClientError } from '@sveltejs/kit'

export function catalystClientErrorHandler(
  errorHandler: HandleClientError
): HandleClientError {
  return (input) => {
    const { error } = input
    if (error instanceof Error) {
      getCatalystWeb().recordError('error', error)
    } else {
      getCatalystWeb().recordLog({
        severity: 'error',
        message: '' + error,
        rawMessage: '' + error,
        args: {},
      })
    }
    errorHandler(input)
  }
}
