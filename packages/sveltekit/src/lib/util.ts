export function getRouteParams(
  params: Partial<Record<string, string>>
): Record<string, string> {
  const definedParams: Record<string, string> = {}
  for (const [k, v] of Object.entries(params)) {
    if (v != null) {
      definedParams[k] = v
    }
  }
  return definedParams
}
