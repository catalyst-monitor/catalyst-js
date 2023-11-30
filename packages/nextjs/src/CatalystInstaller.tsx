import React from 'react'
import { installNodeBase } from '@catalyst-monitor/core'
import CatalystClientInstaller from './CatalystClientInstaller'
import { getOrInitContext, getStore } from './server'

export default function Catalyst({
  serverSystemName,
  clientSystemName,
  publicKey,
  privateKey,
  version,
  baseUrl,
}: {
  serverSystemName: string
  clientSystemName: string
  publicKey: string
  privateKey: string
  version: string
  baseUrl?: string
}) {
  const store = getStore()

  installNodeBase(
    {
      privateKey,
      systemName: serverSystemName,
      version,
      baseUrl,
    },
    {
      disableDuplicateInstallWarning: true,
    }
  )
  if (store == null) {
    return null
  }
  return (
    <CatalystClientInstaller
      systemName={clientSystemName}
      version={version}
      publicKey={publicKey}
      sessionId={getOrInitContext(store).sessionId}
      baseUrl={baseUrl}
    />
  )
}
