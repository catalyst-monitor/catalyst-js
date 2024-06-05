import parser from '@babel/parser'
import * as t from '@babel/types'
import generate from '@babel/generator'
import type * as webpack from 'webpack'
import {
  CatalystInitOptions,
  buildInit,
  removeFilePath,
  wrapDefaultExport,
} from './loader.js'

interface PageLoaderOptions {
  originalPath: string
  catalystInit: CatalystInitOptions
}

export default function loader(
  this: webpack.LoaderContext<PageLoaderOptions>,
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
  const wrapIdentifier = t.identifier('wrapServerPage')

  let path = this.resourcePath
  if (this.resourcePath.startsWith(options.originalPath)) {
    path = path.slice(options.originalPath.length)
  }
  path = removeFilePath(path)

  const ast = parser.parse(source, { sourceType: 'module' })
  const body = ast.program.body

  const replaced = wrapDefaultExport(body, (newExpr) =>
    t.exportDefaultDeclaration(
      t.callExpression(wrapIdentifier, [
        buildInit(options.catalystInit),
        t.stringLiteral(path),
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
