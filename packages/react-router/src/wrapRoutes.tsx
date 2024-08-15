import React from 'react'
import {
  Outlet as OutletOrig,
  type RouteObject,
  useLocation as useLocationOrig,
} from 'react-router'
import Catalyst from './Catalyst.js'
// import Catalyst from './Catalyst'

export function wrapRoutes(
  routes: RouteObject[],
  // Why do we need to pass in the React Router dependencies?
  // Context is module scoped, so if we simply use import and use the
  // dependency, they won't have the value in context.
  contextObjs: {
    Outlet: typeof OutletOrig
    useLocation: typeof useLocationOrig
  }
): RouteObject[] {
  const routeCopy = [...routes]
  const previousRoot = routeCopy.find((r) => r.path == '/')
  if (previousRoot != null) {
    previousRoot.path = undefined
    previousRoot.index = true
  }
  return [
    {
      path: '/',
      element: <Catalyst routes={routeCopy} {...contextObjs} />,
      children: routeCopy,
    },
  ]
}
