'use client'

import {
  COOKIE_NAME,
  getCatalystWeb,
  installWebBase,
} from '@catalyst-monitor/core/web'
import { useParams, usePathname } from 'next/navigation'
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
  sessionId: string
  publicKey: string
  baseUrl?: string
}): React.ReactNode {
  const pathname = usePathname()
  const params = useParams()

  useLayoutEffect(() => {
    document.cookie = `${COOKIE_NAME}=${sessionId}; Expires=0; SameSite=Strict`
    installWebBase({
      systemName,
      version,
      userAgent: navigator.userAgent,
      publicKey: publicKey,
      baseUrl,
    })
  }, [baseUrl, publicKey, sessionId, systemName, version])

  // This is a mega hack to get the raw params.
  // Basically, if a param value is ever the same as part of the path,
  // then the unreplaced path will always be wrong.
  useEffect(() => {
    let rawPath = pathname
    for (const entry of Object.entries(params)) {
      if (Array.isArray(entry[1])) {
        rawPath = rawPath.replace(
          new RegExp(`/${entry[1].join('/')}($|/)`),
          `/[...${entry[0]}]$1`
        )
      } else {
        rawPath = rawPath.replace(
          new RegExp(`/${entry[1]}($|/)`),
          `/[${entry[0]}]$1`
        )
      }
    }
    getCatalystWeb().recordPageView(rawPath, params)
  }, [pathname, params])

  return null
}
