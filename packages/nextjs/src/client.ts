'use client'

import { useEffect, useLayoutEffect } from 'react'
import { useParams, usePathname } from 'next/navigation'
import { DoctorClient, installWebBase } from '@doctor/javascript-core'

export function wrapError(
  component: (props: {
    error: Error & { digest?: string }
    reset: () => void
  }) => React.ReactNode
) {
  return ({
    error,
    reset,
  }: {
    error: Error & { digest?: string }
    reset: () => void
  }) => {
    DoctorClient.get().recordLog('error', error, {})
    return component({ error, reset })
  }
}

export function DoctorClientInstaller({
  baseUrl,
  systemName,
  version,
  publicKey,
  sessionId,
  loggedInEmail,
  loggedInId,
}: {
  baseUrl: string
  systemName: string
  version: string
  publicKey: string
  sessionId: string
  loggedInEmail?: string
  loggedInId?: string
}) {
  const pathname = usePathname()
  const params = useParams()

  useLayoutEffect(() => {
    installWebBase(
      {
        baseUrl,
        systemName: systemName,
        userAgent: window.navigator.userAgent,
        version: version,
        publicKey,
      },
      {
        existingSessionId: sessionId,
        loggedInEmail,
        loggedInId,
      }
    )
  }, [
    baseUrl,
    publicKey,
    systemName,
    version,
    sessionId,
    loggedInEmail,
    loggedInId,
  ])
  useEffect(() => {
    let rawPath = pathname
    for (const entry of Object.entries(params)) {
      if (Array.isArray(entry[1])) {
        rawPath = rawPath.replace(entry[1].join('/'), `[...${entry[0]}]`)
      } else {
        rawPath = rawPath.replace(entry[1], `[${entry[0]}]`)
      }
    }
    DoctorClient.get().recordPageView(rawPath, params)
  }, [pathname, params])
  return null
}
