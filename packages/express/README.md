# Catalyst Express Instrumentation

`@catalyst-monitor/express` instruments Express for [Catalyst](https://www.catalystmonitor.com), the no-configuration monitoring tool.

## Installation

You can also check out the Express instrumentation documentation [here](https://www.catalystmonitor.com/docs/install/javascript/express).

Before you start, please sign up for an account on the [Catalyst dashboard](https://app.catalystmonitor.com).

Install the packages:

```bash
npm install @catalyst-monitor/server @catalyst-monitor/express
```

If you haven't already, start Catalyst as soon as possible:

```ts
import Catalyst from '@catalyst-monitor/server'

Catalyst.start({
  privateKey: '<Get from Catalyst>',
  systemName: 'distingushing-name-here',
  version: 'any-version-string-here',
})
```

Then, instrument Express:

```ts
import express from 'express'
import {
  catalystErrorHandler,
  catalystHandler,
} from '@catalyst-monitor/express'

const app = express()

// The Catalyst middleware should be installed as early as possible
// to capture any logs and errors.
app.use(catalystHandler)

// Your routes here...

// The Catalyst error handler should be installed as late as possible
// to record any uncaught errors.
app.use(catalystErrorHandler)
```

## Developing

### Building

To build the library:

```bash
yarn build
```
