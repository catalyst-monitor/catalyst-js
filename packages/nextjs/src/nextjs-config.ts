import { NextConfig } from 'next'
import path from 'path'
import { CatalystInitOptions } from './loader'

export function withCatalystConfig(
  oldConfig: NextConfig,
  catalystInit: CatalystInitOptions
): NextConfig {
  const oldWebpackFn = oldConfig.webpack
  return {
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
          path.resolve(__dirname, 'app'),
          path.resolve(__dirname, 'src', 'app'),
        ],
        use: [
          {
            loader: '@catalyst-monitor/nextjs/dist/page-loader',
            options: {
              catalystInit,
              originalPath: __dirname,
            },
          },
        ],
      })
      oldWpConfig.module.rules.unshift({
        test: /\/(?!page|loading|not-found|error|global-error|template).+\.(tsx|jsx)$/,
        include: [
          path.resolve(__dirname, 'app'),
          path.resolve(__dirname, 'src', 'app'),
        ],
        use: [
          {
            loader: '@catalyst-monitor/nextjs/dist/component-loader',
            options: {
              catalystInit,
            },
          },
        ],
      })
      oldWpConfig.module.rules.unshift({
        test: /\/route.(ts|js)$/,
        include: [
          path.resolve(__dirname, 'app'),
          path.resolve(__dirname, 'src', 'app'),
        ],
        use: [
          {
            loader: '@catalyst-monitor/nextjs/dist/route-handler-loader',
            options: {
              catalystInit,
              originalPath: __dirname,
            },
          },
        ],
      })
      oldWpConfig.module.rules.unshift({
        test: (p: string) => {
          if (p.startsWith(__dirname)) {
            return (
              p == path.resolve(__dirname, 'middleware.ts') ||
              p == path.resolve(__dirname, 'middleware.js')
            )
          }
          return p == 'middlware.ts' || p == 'middleware.js'
        },
        use: [
          {
            loader: '@catalyst-monitor/nextjs/dist/middleware-loader',
            options: {
              catalystInit,
              originalPath: __dirname,
            },
          },
        ],
      })

      return oldWpConfig
    },
  }
}
