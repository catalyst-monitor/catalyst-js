import * as t from '@babel/types'

export function replaceReactComponent(
  body: t.Statement[],
  buildNewExport: (
    toWrap: t.Identifier | t.ArrowFunctionExpression
  ) => t.ExportDefaultDeclaration
): boolean {
  const exportIdx = body.findIndex((n) => n.type == 'ExportDefaultDeclaration')
  if (exportIdx == -1) {
    return false
  }
  const exportNode = body[exportIdx]
  if (exportNode.type != 'ExportDefaultDeclaration') {
    return false
  }

  if (exportNode.declaration.type == 'FunctionDeclaration') {
    const declaration = exportNode.declaration
    if (declaration.id == null) {
      declaration.id = t.identifier('__CatalystWrappedFunction')
    }
    body.splice(exportIdx, 1, declaration, buildNewExport(declaration.id))
  } else if (exportNode.declaration.type == 'ArrowFunctionExpression') {
    const declaration = exportNode.declaration
    body.splice(exportIdx, 1, buildNewExport(declaration))
  } else if (exportNode.declaration.type == 'Identifier') {
    const declaration = exportNode.declaration
    body.splice(exportIdx, 1, buildNewExport(declaration))
  } else {
    return false
  }
  return true
}
