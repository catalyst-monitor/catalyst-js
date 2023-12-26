import JSDOMEnvironment from 'jest-environment-jsdom'
import { TextEncoder, TextDecoder } from 'util'

// https://github.com/facebook/jest/blob/v29.4.3/website/versioned_docs/version-29.4/Configuration.md#testenvironment-string
export default class FixJSDOMEnvironment extends JSDOMEnvironment {
  constructor(...args: ConstructorParameters<typeof JSDOMEnvironment>) {
    super(...args)

    // https://github.com/jsdom/jsdom/issues/1724
    this.global.fetch = fetch
    this.global.Headers = Headers
    this.global.Request = Request
    this.global.Response = Response

    // @ts-expect-error I hope this works.
    this.global.TextDecoder = TextDecoder
    this.global.TextEncoder = TextEncoder
    this.global.crypto.randomUUID = () => '1111-1111-1111-1111-1111'
  }
}
