import { default as CatalystWeb } from '@catalyst-monitor/web'
import React from 'react'
import { useLayoutEffect } from 'react'
import {
  Outlet as OutletOrig,
  type RouteObject,
  matchRoutes,
  useLocation as useLocationOrig,
} from 'react-router-dom'

export default function Catalyst({
  routes,
  useLocation,
  Outlet,
}: {
  routes: RouteObject[]
  useLocation: typeof useLocationOrig
  Outlet: typeof OutletOrig
}) {
  const location = useLocation()
  useLayoutEffect(() => {
    const matches = matchRoutes(routes, location.pathname)
    if (matches != null && matches.length != 0) {
      const params = matches[matches.length - 1].params

      // Filter out undefineds.
      const definedParams = Object.fromEntries(
        Object.entries(params)
          .filter((e) => e[1] != null)
          .map((e) => [e[0], e[1]!])
      )

      const builtPath = matches.map((m) => m.route.path).join('/')
      // Record the page view in the next frame, so any click handlers will run first.
      CatalystWeb.getReporter().recordPageView({
        rawPath: location.pathname,
        pathPattern:
          builtPath != '' && location.pathname != '/' ? builtPath : '/',
        args: definedParams,
      })
    }
  }, [location.pathname, routes])

  return <Outlet />
}
