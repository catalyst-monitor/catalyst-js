import * as t from '@babel/types'

export function removeFilePath(filePath: string): string {
  const replacedPath = filePath
    .replace(/^\/app/, '')
    .replace(/\/[^/]+?\.(t|j)sx$/, '')
  if (replacedPath == '') {
    return '/'
  }
  return replacedPath
}

export function buildObjectProperty(k: string, v: string): t.ObjectProperty {
  return t.objectProperty(t.identifier(k), t.stringLiteral(v))
}

export function wrapDefaultExport(
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

  const declaration = exportNode.declaration
  if (declaration.type == 'FunctionDeclaration') {
    if (declaration.id == null) {
      declaration.id = t.identifier('__CatalystWrappedFunction')
    }
    body.splice(exportIdx, 1, declaration, buildNewExport(declaration.id))
  } else if (declaration.type == 'ArrowFunctionExpression') {
    body.splice(exportIdx, 1, buildNewExport(declaration))
  } else if (declaration.type == 'Identifier') {
    body.splice(exportIdx, 1, buildNewExport(declaration))
  } else {
    return false
  }
  return true
}

export function wrapNamedExports(
  body: t.Statement[],
  namedExportsToWrap: string[],
  buildNewCall: (
    toWrap: t.Identifier | t.FunctionExpression | t.ArrowFunctionExpression,
    exportedName: string
  ) => t.CallExpression
): boolean {
  const bodyCopy = [...body]
  let shouldImport = false

  const toWrap: { local: string; exported: string }[] = []
  for (let statementIdx = 0; statementIdx < bodyCopy.length; statementIdx++) {
    const statement = bodyCopy[statementIdx]
    if (!t.isExportNamedDeclaration(statement)) {
      continue
    }

    const declaration = statement.declaration
    if (declaration?.type == 'FunctionDeclaration') {
      const oldFnName = declaration.id?.name
      if (oldFnName == null || !namedExportsToWrap.includes(oldFnName)) {
        continue
      }
      declaration.id = t.identifier(`${oldFnName}__catalystWrappedNamedExport`)
      body.splice(
        statementIdx,
        1,
        declaration,
        t.exportNamedDeclaration(
          t.variableDeclaration('const', [
            t.variableDeclarator(
              t.identifier(oldFnName),
              buildNewCall(declaration.id, oldFnName)
            ),
          ])
        )
      )
      shouldImport = true
    } else if (declaration?.type == 'VariableDeclaration') {
      for (let varIdx = 0; varIdx < declaration.declarations.length; varIdx++) {
        const decVar = declaration.declarations[varIdx]
        if (
          !t.isIdentifier(decVar.id) ||
          !namedExportsToWrap.includes(decVar.id.name) ||
          (decVar.init?.type != 'ArrowFunctionExpression' &&
            decVar.init?.type != 'FunctionExpression')
        ) {
          continue
        }
        decVar.init = buildNewCall(decVar.init, decVar.id.name)
        shouldImport = true
      }
    } else {
      for (const spec of statement.specifiers) {
        if (!t.isExportSpecifier(spec)) {
          continue
        }
        const exportedName = t.isStringLiteral(spec.exported)
          ? spec.exported.value
          : spec.exported.name
        if (!namedExportsToWrap.includes(exportedName)) {
          continue
        }
        for (const spec of statement.specifiers) {
          if (!t.isExportSpecifier(spec)) {
            continue
          }
          const exportedName = t.isStringLiteral(spec.exported)
            ? spec.exported.value
            : spec.exported.name
          if (namedExportsToWrap.includes(exportedName)) {
            toWrap.push({ exported: exportedName, local: spec.local.name })
          }
        }
      }
    }
  }

  for (let stIdx = 0; stIdx < body.length; stIdx++) {
    const statement = body[stIdx]
    if (t.isDeclaration(statement)) {
      const declaration = statement
      if (
        declaration?.type == 'FunctionDeclaration' &&
        declaration.id != null
      ) {
        const oldFnName = declaration.id.name
        const mapping = toWrap.find((v) => v.local == oldFnName)
        if (mapping == null) {
          continue
        }
        declaration.id = t.identifier(`${oldFnName}__catalystWrappedFn`)
        body.splice(
          stIdx,
          1,
          declaration,
          t.variableDeclaration('const', [
            t.variableDeclarator(
              t.identifier(oldFnName),
              buildNewCall(declaration.id, mapping.exported)
            ),
          ])
        )
        shouldImport = true
      } else if (declaration?.type == 'VariableDeclaration') {
        for (
          let varIdx = 0;
          varIdx < declaration.declarations.length;
          varIdx++
        ) {
          const decVar = declaration.declarations[varIdx]
          const decId = decVar.id
          if (
            !t.isIdentifier(decId) ||
            !namedExportsToWrap.includes(decId.name) ||
            (decVar.init?.type != 'ArrowFunctionExpression' &&
              decVar.init?.type != 'FunctionExpression')
          ) {
            continue
          }
          const mapping = toWrap.find((v) => v.local == decId.name)
          if (mapping == null) {
            continue
          }

          decVar.init = buildNewCall(decVar.init, mapping.exported)
        }
        shouldImport = true
      }
    }
  }
  return shouldImport
}
