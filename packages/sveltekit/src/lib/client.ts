export { default as Catalyst } from '@catalyst-monitor/web'
export * from '@catalyst-monitor/web'
import Catalyst from '@catalyst-monitor/web'
import type { HandleClientError } from '@sveltejs/kit'

export function catalystClientErrorHandler(
  errorHandler: HandleClientError
): HandleClientError {
  return (input) => {
    const { error } = input
    if (error instanceof Error) {
      Catalyst.getReporter().recordError('error', error)
    } else {
      Catalyst.getReporter().recordLog({
        severity: 'error',
        message: '' + error,
        rawMessage: '' + error,
        args: {},
      })
    }
    errorHandler(input)
  }
}
