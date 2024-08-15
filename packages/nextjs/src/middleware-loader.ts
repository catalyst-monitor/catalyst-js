import parser from '@babel/parser'
import * as t from '@babel/types'
import generate from '@babel/generator'
import type * as webpack from 'webpack'
import { wrapNamedExports } from './loader.js'

export default function loader(
  this: webpack.LoaderContext<void>,
  source: string
): string {
  const ast = parser.parse(source, { sourceType: 'module' })
  const body = ast.program.body

  const wrapIdentifier = t.identifier('wrapMiddleware')

  const shouldImport = wrapNamedExports(body, ['middleware'], (id) =>
    t.callExpression(wrapIdentifier, [id])
  )

  if (shouldImport) {
    body.unshift(
      t.importDeclaration(
        [t.importSpecifier(wrapIdentifier, wrapIdentifier)],
        t.stringLiteral('@catalyst-monitor/nextjs')
      )
    )
  }

  return generate.default(ast, {}, source).code
}
