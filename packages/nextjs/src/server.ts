import {
  DoctorServer,
  DoctorServerConfig,
  ServerRequestContext,
  createDoctorContext,
  getDoctorContext,
  installNodeBase,
} from '@doctor/javascript-core'
import { Fragment, createElement } from 'react'
import { DoctorClientInstaller } from './client'

export function instrumentDoctor(config: DoctorServerConfig) {
  installNodeBase(config)
}

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
          console.log('GOT ME1', DoctorServer.get())
          DoctorServer.get().recordLog('error', e, {}, context)
          throw e
        })
      }
      return retVal
    } catch (e) {
      console.log('GOT ME2', DoctorServer.get())
      DoctorServer.get().recordLog('error', e, {}, context)
      throw e
    }
  }
}

export function DoctorWrapper({
  children,
  publicKey,
}: {
  children: React.ReactNode
  publicKey: string
}) {
  const newContext: ServerRequestContext = {
    fetchId: crypto.randomUUID(),
    sessionId: crypto.randomUUID(),
  }
  const doctorServer = DoctorServer.get()
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
