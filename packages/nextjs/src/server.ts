import {
  DoctorServer,
  ServerRequestContext,
  createDoctorContext,
  getDoctorContext,
} from '@doctor/javascript-core'
import { Fragment, createElement } from 'react'
import { DoctorClientInstaller } from './client'

export function wrapRouteHandler() {}

export function wrapUseServerPage<
  T extends React.ReactNode | Promise<React.ReactNode>,
  P,
>(component: (p: P) => T): (p: P) => T {
  return (p: P) => {
    const context = getDoctorContext()
    if (context == null) {
      console.warn('React Server Component called without context!')
      return component(p)
    }
    try {
      const retVal = component(p)
      if (retVal instanceof Promise) {
        retVal.catch((e) => {
          DoctorServer.get().recordLog('error', e, {}, context)
          throw e
        })
      }
      return retVal
    } catch (e) {
      DoctorServer.get().recordLog('error', e, {}, context)
      throw e
    }
  }
}

export function DoctorWrapper({
  children,
  publicKey,
  privateKey,
  systemName,
  version,
  baseUrl,
}: {
  baseUrl: string
  children: React.ReactNode
  privateKey: string
  systemName: string
  version: string
  publicKey: string
}) {
  const newContext: ServerRequestContext = {
    fetchId: crypto.randomUUID(),
    sessionId: crypto.randomUUID(),
  }
  const doctorServer = DoctorServer.init({
    baseUrl,
    privateKey,
    systemName,
    version,
  })
  return createDoctorContext(newContext, () =>
    createElement(
      Fragment,
      {},
      children,
      createElement(DoctorClientInstaller, {
        baseUrl: doctorServer.config.baseUrl,
        systemName: `${doctorServer.config.systemName}-fe`,
        version: doctorServer.config.version,
        publicKey,
        sessionId: newContext.sessionId,
      })
    )
  )
}
