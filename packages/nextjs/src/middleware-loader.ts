import parser from '@babel/parser'
import * as t from '@babel/types'
import generate from '@babel/generator'
import type * as webpack from 'webpack'
import { CatalystInitOptions, buildInit, wrapNamedExports } from './loader.js'

interface MiddlewareLoaderOptions {
  catalystInit: CatalystInitOptions
}

export default function loader(
  this: webpack.LoaderContext<MiddlewareLoaderOptions>,
  source: string
): string {
  const options = this.getOptions()
  const ast = parser.parse(source, { sourceType: 'module' })
  const body = ast.program.body

  const wrapIdentifier = t.identifier('wrapMiddleware')

  const shouldImport = wrapNamedExports(body, ['middleware'], (id) =>
    t.callExpression(wrapIdentifier, [buildInit(options.catalystInit), id])
  )

  if (shouldImport) {
    body.unshift(
      t.importDeclaration(
        [t.importSpecifier(wrapIdentifier, wrapIdentifier)],
        t.stringLiteral('@catalyst-monitor/nextjs')
      )
    )
  }

  // @ts-expect-error No idea why Webpack module import is different.
  return generate.default(ast, {}, source).code
}
