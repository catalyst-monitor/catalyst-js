'use client'

import { COOKIE_NAME, installWebBase } from '@catalyst-monitor/core'
import { useLayoutEffect } from 'react'

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
  return null
}
