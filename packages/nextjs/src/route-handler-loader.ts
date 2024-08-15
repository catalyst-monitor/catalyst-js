import parser from '@babel/parser'
import * as t from '@babel/types'
import generate from '@babel/generator'
import type * as webpack from 'webpack'
import { removeFilePath, wrapNamedExports } from './loader.js'

interface RouteHandlerLoaderOptions {
  originalPath: string
}

const METHODS_TO_WRAP = [
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'HEAD',
  'OPTIONS',
]

export default function loader(
  this: webpack.LoaderContext<RouteHandlerLoaderOptions>,
  source: string
): string {
  const wrapIdentifier = t.identifier('wrapRouteHandler')
  const options = this.getOptions()

  let path = this.resourcePath
  if (this.resourcePath.startsWith(options.originalPath)) {
    path = path.slice(options.originalPath.length)
  }
  path = removeFilePath(path)

  const ast = parser.parse(source, { sourceType: 'module' })
  const body = ast.program.body

  const shouldImport = wrapNamedExports(body, METHODS_TO_WRAP, (id, exported) =>
    t.callExpression(wrapIdentifier, [
      t.stringLiteral(exported),
      t.stringLiteral(path),
      id,
    ])
  )

  if (shouldImport) {
    body.unshift(
      t.importDeclaration(
        [t.importSpecifier(wrapIdentifier, wrapIdentifier)],
        t.stringLiteral('@catalyst-monitor/nextjs')
      )
    )
  }

  const generated = generate.default(ast, {}, source).code
  return generated
}
