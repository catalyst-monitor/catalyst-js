import React from 'react'
import CatalystClientInstaller from './CatalystClientInstaller'
import { getCatalystOptions, getOrInitContext, getStore } from './server'

export default function Catalyst() {
  const store = getStore()
  const initOptions = getCatalystOptions()
  if (store == null || initOptions == null) {
    return null
  }
  return (
    <CatalystClientInstaller
      systemName={`${initOptions?.systemName}-fe`}
      version={initOptions.version}
      publicKey={initOptions.publicKey}
      sessionId={getOrInitContext(store).sessionId}
      baseUrl={initOptions.baseUrl}
    />
  )
}
