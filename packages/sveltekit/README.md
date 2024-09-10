# Catalyst Sveltekit Instrumentation

`@catalyst-monitor/sveltekit` comprehensively instruments SvelteKit for [Catalyst](https://www.catalystmonitor.com), the no-configuration monitoring tool. Using the library gets you:

- Propagated trace data, for correlated events across the stack
- Client and server logging and exceptions tracking
- Error rates for page visits and server endpoints

## Installation

You can also find the most up-to-date documentation [here](https://www.catalystmonitor.com/docs/install/javascript/sveltekit).

Before you start, please sign up for an account on the [Catalyst dashboard](https://app.catalystmonitor.com).

```bash
npm install @catalyst-monitor/sveltekit
```

Create or update your `hooks.client.ts`

```ts
// src/hooks.client.ts
import {
  Catalyst,
  catalystClientErrorHandler,
} from '@catalyst-monitor/sveltekit/server'

Catalyst.start({
  systemName: 'any-distinguishing-name',
  version: 'any-distinguishing-version',
  publicKey: '<The public key from your Catalyst account>',
  userAgent: window.navigator.userAgent,
})

export const handleError = catalystClientErrorHandler(() => {
  // Your existing error handler here.
})
```

Create or update your `hooks.server.ts`

```ts
// src/hooks.server.ts
import {
  catalystHandler,
  wrapCatalystFetchHandler,
  wrapCatalystServerErrorHandler,
  Catalyst,
} from '@catalyst-monitor/sveltekit/server'
import { sequence } from '@sveltejs/kit/hooks'

Catalyst.start({
  privateKey: '<The private key from your Catalyst account>',
  systemName: 'any-distinguishing-name',
  version: 'any-distinguishing-version',
})

// All Catalyst functions can optionally wrap your existing hooks.
export const handleError = wrapCatalystServerErrorHandler(existingHandleError)
export const handleFetch = wrapCatalystFetchHandler(existingHandleFetch)
export const handle = sequence(catalystHandler, existingHandle)
```

Add the Catalyst component to your root `+layout.svelte`

```sveltekit
<!-- src/routes/+layout.svelte -->
<script>
  import Catalyst from '@catalyst-monitor/sveltekit/Catalyst.svelte'
</script>

<Catalyst />
<slot />
```

## Developing

### Building

To build the library:

```bash
yarn package
```

### Developing in the Sandbox

The code includes a sandbox SvelteKit app that you can run to test the library. Nothing in the sandbox will be included in the packaged library, only files in `src/lib` will be included.

To start the sandbox, simply run:

```bash
yarn dev

# or start the server and open the app in a new browser tab
yarn dev --open
```
