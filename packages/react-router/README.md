# Catalyst React Router v6 Instrumentation

`@catalyst-monitor/react-router` instruments React Router v6 for [Catalyst](https://www.catalystmonitor.com), the no-configuration monitoring tool.

## Installation

You can also check out the React Router instrumentation documentation [here](https://www.catalystmonitor.com/docs/install/javascript/react-router).

Before you start, please sign up for an account on the [Catalyst dashboard](https://app.catalystmonitor.com).

Install the packages:

```bash
npm install @catalyst-monitor/web @catalyst-monitor/react-router
```

If you haven't already, start Catalyst as soon as possible:

```ts
import Catalyst from '@catalyst-monitor/web'

Catalyst.start({
  publicKey: '<Get from the Catalyst>',
  systemName: 'distingushing-name-here',
  version: 'any-version-string-here',
  userAgent: navigator.userAgent,
})
```

Then, wrap your routes:

```ts
import { Outlet, useLocation, createBrowserRouter } from 'react-router-dom'
import { wrapRoutes } from '@catalyst-monitor/react-router'

const router = createBrowserRouter(
  // Wrap your React Router routes with Catalyst.
  wrapRoutes(
    [
      // Your routes, as-is, here.
    ],
    // Pass-through React context-dependent code.
    // This is required, because React context is module-scoped.
    {
      Outlet,
      useLocation,
    }
  )
)
```

## Developing

### Building

To build the library:

```bash
yarn build
```
