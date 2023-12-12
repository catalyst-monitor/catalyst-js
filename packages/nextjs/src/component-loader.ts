import parser from '@babel/parser'
import * as t from '@babel/types'
import generate from '@babel/generator'
import type * as webpack from 'webpack'
import { CatalystInitOptions, buildInit, wrapDefaultExport } from './loader.js'

interface ComponentLoaderOptions {
  catalystInit: CatalystInitOptions
}

export default function loader(
  this: webpack.LoaderContext<ComponentLoaderOptions>,
  source: string
): string {
  if (source.startsWith('/* __next_internal_client_entry_do_not_use__')) {
    return source
  }
  if (
    source.startsWith(
      'import { createProxy } from "next/dist/build/webpack/loaders/next-flight-loader/module-proxy"'
    )
  ) {
    return source
  }

  const options = this.getOptions()
  const ast = parser.parse(source, { sourceType: 'module' })
  const body = ast.program.body

  const wrapIdentifier = t.identifier('wrapServerComponent')

  const replaced = wrapDefaultExport(body, (newExpr) =>
    t.exportDefaultDeclaration(
      t.callExpression(wrapIdentifier, [
        buildInit(options.catalystInit),
        newExpr,
      ])
    )
  )
  if (replaced) {
    body.unshift(
      t.importDeclaration(
        [t.importSpecifier(wrapIdentifier, wrapIdentifier)],
        t.stringLiteral('@catalyst-monitor/nextjs/server')
      )
    )
  }

  // @ts-expect-error No idea why Webpack module import is different.
  return generate.default(ast, {}, source).code
}
