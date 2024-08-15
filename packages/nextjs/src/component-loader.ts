import parser from '@babel/parser'
import * as t from '@babel/types'
import generate from '@babel/generator'
import type * as webpack from 'webpack'
import { wrapDefaultExport } from './loader.js'

export default function loader(
  this: webpack.LoaderContext<void>,
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

  const ast = parser.parse(source, { sourceType: 'module' })
  const body = ast.program.body

  const wrapIdentifier = t.identifier('wrapServerComponent')

  const replaced = wrapDefaultExport(body, (newExpr) =>
    t.exportDefaultDeclaration(t.callExpression(wrapIdentifier, [newExpr]))
  )
  if (replaced) {
    body.unshift(
      t.importDeclaration(
        [t.importSpecifier(wrapIdentifier, wrapIdentifier)],
        t.stringLiteral('@catalyst-monitor/nextjs')
      )
    )
  }

  return generate.default(ast, {}, source).code
}
