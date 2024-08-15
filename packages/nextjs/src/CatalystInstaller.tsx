import React from 'react'
import CatalystClientInstaller from './CatalystClientInstaller.js'
import { getSessionId } from './store.js'
import { getConfig } from './config.js'

export default function Catalyst() {
  const config = getConfig()
  if (config == null) {
    console.warn('Could not get Catalyst config! Is Catalyst installed?')
    return null
  }
  return (
    <CatalystClientInstaller
      systemName={`${config.systemName}-fe`}
      version={config.version}
      publicKey={config.publicKey}
      sessionId={getSessionId() ?? undefined}
      baseUrl={config.clientBaseUrl}
    />
  )
}
