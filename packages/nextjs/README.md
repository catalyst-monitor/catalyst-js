# Catalyst Next.JS Instrumentation

**For now, only the App Router is supported**

`@catalyst-monitor/nextjs` comprehensively instruments Next.JS for [Catalyst](https://www.catalystmonitor.com), the no-configuration monitoring tool. Using the library gets you:

- Propagated trace data, for correlated events across the stack
- Client and server logging and exceptions tracking
- Error rates for page visits and server endpoints

## Installation

You can also find the most up-to-date documentation [here](https://www.catalystmonitor.com/docs/install/javascript/nextjs).

Before you start, please sign up for an account on the [Catalyst dashboard](https://app.catalystmonitor.com).

```bash
npm install @catalyst-monitor/nextjs
```

Update your Next.JS config:

```js
// next.config.mjs
import * as catalystConfig from '@catalyst-monitor/nextjs/config'

export default catalystConfig.withCatalystConfig(
  {
    // Optional: turn off strict mode
    // Strict Mode causes effects to be ran twice during development.
    // Since Catalyst sometimes runs in effects, this causes
    // double-reporting of events.
    reactStrictMode: false,
  },
  {
    systemName: 'any-distinguishing-name-here',
    publicKey: '<Key from your Catalyst settings>',
    privateKey: '<Key from your Catalyst settings>',
    version: 'any-distinguishing-version-string',
  }
)
```

Note that this also turns on the [instrumentation hook](https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation). Use the instrumentation hook to start Catalyst.

```ts
// instrumentation.ts
import CatalystNextJS from '@catalyst-monitor/nextjs'
import catalyst from './catalyst.mjs'

export async function register() {
  CatalystNextJS.start(catalyst)
}
```

Add the Catalyst component to your root `layout.tsx`

```tsx
// app/layout.tsx
import { CatalystInstaller } from '@catalyst-monitor/nextjs'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <CatalystInstaller />
        {children}
      </body>
    </html>
  )
}
```

## Developing

### Building

To build the library:

```bash
yarn build
```

### Developing in the Sandbox

The code includes a sandbox Next.JS app that you can run to test the library, with common use-cases for Catalyst.

To start the sandbox, simply run:

```bash
cd test

yarn dev

# or start the server and open the app in a new browser tab
yarn dev --open
```
