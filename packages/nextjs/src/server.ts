import {
  CatalystServer,
  ServerRequestContext,
  createCatalystContext,
  getCatalystContext,
  COOKIE_NAME,
} from '@doctor/javascript-core'
import { cookies } from 'next/headers'
import { Fragment, createElement } from 'react'
import { DoctorClientInstaller } from './client'
import { NextRequest } from 'next/dist/server/web/spec-extension/request'
import { NextResponse } from 'next/dist/server/web/spec-extension/response'

export function wrapRouteHandler() {}

export function wrapMiddleware(
  mw: (request: NextRequest) => NextResponse
): (request: NextRequest) => NextResponse {
  return (request: NextRequest) => {
    const resp = mw(request)
    const cookie = request.cookies.get(COOKIE_NAME)
    if (cookie == null) {
      resp.cookies.set(COOKIE_NAME, crypto.randomUUID(), {
        sameSite: 'strict',
        expires: 0,
      })
    }
    return resp
  }
}

export function wrapUseServerPage<
  T extends React.ReactNode | Promise<React.ReactNode>,
  P,
>(component: (p: P) => T): (p: P) => T {
  return (p: P) => {
    const context = getCatalystContext()
    if (context == null) {
      console.warn('React Server Component called without context!')
      return component(p)
    }
    try {
      const retVal = component(p)
      if (retVal instanceof Promise) {
        retVal.catch((e) => {
          CatalystServer.get().recordLog('error', e, {}, context)
          throw e
        })
      }
      return retVal
    } catch (e) {
      CatalystServer.get().recordLog('error', e, {}, context)
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
  const cookieStore = cookies()
  let cookie = cookieStore.get(COOKIE_NAME)?.value
  if (cookie == null) {
    cookie = crypto.randomUUID()
    cookieStore.set(COOKIE_NAME, cookie, {
      sameSite: 'strict',
      expires: 0,
    })
  }
  const doctorServer = CatalystServer.init({
    baseUrl,
    privateKey,
    systemName,
    version,
  })
  return createCatalystContext(newContext, () =>
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
