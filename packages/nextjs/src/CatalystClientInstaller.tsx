'use client'

import Catalyst from '@catalyst-monitor/web'
import { useParams, usePathname } from 'next/navigation.js'
import { useEffect, useLayoutEffect } from 'react'

export default function CatalystClient({
  systemName,
  version,
  sessionId,
  publicKey,
  baseUrl,
}: {
  systemName: string
  version: string
  sessionId?: string
  publicKey: string
  baseUrl?: string
}): React.ReactNode {
  const pathname = usePathname()
  const params = useParams()

  useLayoutEffect(() => {
    Catalyst.start({
      systemName,
      version,
      userAgent: navigator.userAgent,
      publicKey: publicKey,
      baseUrl,
      existingSessionId: sessionId,
    })
  }, [baseUrl, publicKey, sessionId, systemName, version])

  // This is a mega hack to get the raw params.
  // Basically, if a param value is ever the same as part of the path,
  // then the unreplaced path will always be wrong.
  useEffect(() => {
    let builtPath = pathname
    for (const entry of Object.entries(params)) {
      if (Array.isArray(entry[1])) {
        builtPath = builtPath.replace(
          new RegExp(`/${entry[1].join('/')}($|/)`),
          `/[...${entry[0]}]$1`
        )
      } else {
        builtPath = builtPath.replace(
          new RegExp(`/${entry[1]}($|/)`),
          `/[${entry[0]}]$1`
        )
      }
    }
    Catalyst.getReporter().recordPageView({
      rawPath: pathname,
      pathPattern: builtPath,
      args: params,
    })
  }, [pathname, params])

  return null
}
