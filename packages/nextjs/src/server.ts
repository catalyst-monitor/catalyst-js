import {
  createCatalystContext,
  COOKIE_NAME,
  getCatalystNode,
} from '@doctor/javascript-core'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/dist/server/web/spec-extension/request'
import { NextResponse } from 'next/dist/server/web/spec-extension/response'
import { AsyncLocalStorage } from 'async_hooks'
import {
  requestAsyncStorage,
  RequestStore,
} from 'next/dist/client/components/request-async-storage.external'
import crypto from 'crypto'
import { differenceInSeconds } from 'date-fns'

export function wrapServerPage<
  T extends { params?: { [key: string]: string } },
>(
  pageName: string,
  component: (props: T) => React.ReactNode
): (props: T) => React.ReactNode {
  return (props) => {
    const store = getStore()
    if (store == null) {
      return component(props)
    }

    const context = getOrInitContext(store)

    const startTime = new Date()
    const sendFetch = isFirstRecordFetch(store)
      ? (success: boolean) => {
          getCatalystNode().recordFetch(
            'get',
            pageName,
            props.params ?? {},
            success ? 200 : 500,
            {
              seconds: differenceInSeconds(new Date(), startTime),
              nanos: 0,
            },
            context
          )
        }
      : () => {}

    return createCatalystContext(context, () => {
      let retVal
      try {
        retVal = component(props)
      } catch (e) {
        sendFetch(false)
        getCatalystNode().recordLog('error', e, {}, context)
        throw e
      }
      if (retVal instanceof Promise) {
        retVal.then(
          (v) => {
            sendFetch(true)
            return v
          },
          (e) => {
            sendFetch(false)
            getCatalystNode().recordLog('error', e, {}, context)
            throw e
          }
        )
      } else {
        sendFetch(true)
      }
      return retVal
    })
  }
}

export function wrapServerComponent<T>(
  component: (props: T) => React.ReactNode
): (props: T) => React.ReactNode {
  return (props) => {
    const store = getStore()
    if (store == null) {
      return component(props)
    }
    const context = getOrInitContext(store)

    return createCatalystContext(context, () => {
      let retVal
      try {
        retVal = component(props)
      } catch (e) {
        getCatalystNode().recordLog('error', e, {}, context)
        throw e
      }
      if (retVal instanceof Promise) {
        retVal.catch((e) => {
          getCatalystNode().recordLog('error', e, {}, context)
          throw e
        })
      }
      return retVal
    })
  }
}

export function wrapRouteHandler() {}

export function wrapMiddleware(
  mw: (request: NextRequest) => NextResponse
): (request: NextRequest) => NextResponse {
  return (request: NextRequest) => {
    const resp = mw(request)
    const cookie = request.cookies.get(COOKIE_NAME)
    return resp
  }
}

interface NextJSCatalystContext {
  sessionId: string
  fetchId: string
}

type ExtendedRequestAsyncStorageType = RequestStore & {
  __catalystContext?: NextJSCatalystContext
  __catalystFetchRecorded?: boolean
}

export function getStore() {
  return (
    requestAsyncStorage as
      | AsyncLocalStorage<ExtendedRequestAsyncStorageType>
      | undefined
  )?.getStore()
}

export function getOrInitContext(
  store: ExtendedRequestAsyncStorageType
): NextJSCatalystContext {
  if (store.__catalystContext == null) {
    const sessionId = cookies().get(COOKIE_NAME)?.value ?? crypto.randomUUID()
    store.__catalystContext = {
      sessionId: sessionId,
      fetchId: crypto.randomUUID(),
    }
  }

  return store.__catalystContext
}

function isFirstRecordFetch(store: ExtendedRequestAsyncStorageType): boolean {
  const isFirst = store.__catalystFetchRecorded != true
  store.__catalystFetchRecorded = true
  return isFirst
}
