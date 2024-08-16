import type { NextConfig } from 'next'
import path from 'path'

export function withCatalystConfig(oldConfig: NextConfig): NextConfig {
  const oldWebpackFn = oldConfig.webpack
  return {
    experimental: {
      ...(oldConfig.experimental ?? {}),
      instrumentationHook: true,
    },
    ...oldConfig,
    webpack: (baseWpConfig, options) => {
      const oldWpConfig = oldWebpackFn
        ? oldWebpackFn(baseWpConfig, options)
        : baseWpConfig
      if (!options.isServer) {
        return oldWpConfig
      }

      oldWpConfig.module.rules.unshift({
        test: /(?:page|default)\.(tsx|jsx)$/,
        include: [
          path.resolve(options.dir, 'app'),
          path.resolve(options.dir, 'src', 'app'),
        ],
        use: [
          {
            loader: '@catalyst-monitor/nextjs/page-loader',
            options: {
              originalPath: options.dir,
            },
          },
        ],
      })
      oldWpConfig.module.rules.unshift({
        test: /\/(?!page|loading|not-found|error|global-error|template).+\.(tsx|jsx)$/,
        include: [
          path.resolve(options.dir, 'app'),
          path.resolve(options.dir, 'src', 'app'),
        ],
        use: [
          {
            loader: '@catalyst-monitor/nextjs/component-loader',
          },
        ],
      })
      oldWpConfig.module.rules.unshift({
        test: /\/route.(ts|js)$/,
        include: [
          path.resolve(options.dir, 'app'),
          path.resolve(options.dir, 'src', 'app'),
        ],
        use: [
          {
            loader: '@catalyst-monitor/nextjs/route-handler-loader',
            options: {
              originalPath: options.dir,
            },
          },
        ],
      })
      oldWpConfig.module.rules.unshift({
        test: (p: string) => {
          if (p.startsWith(options.dir)) {
            return (
              p == path.resolve(options.dir, 'middleware.ts') ||
              p == path.resolve(options.dir, 'middleware.js')
            )
          }
          return p == 'middlware.ts' || p == 'middleware.js'
        },
        use: [
          {
            loader: '@catalyst-monitor/nextjs/middleware-loader',
            options: {
              originalPath: options.dir,
            },
          },
        ],
      })

      return oldWpConfig
    },
  }
}
