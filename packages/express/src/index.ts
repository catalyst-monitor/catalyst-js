import { ErrorRequestHandler, RequestHandler } from 'express'
import {
  createCatalystContext,
  getCatalystNode,
  SESSION_ID_HEADER,
  PAGE_VIEW_ID_HEADER,
  PARENT_FETCH_ID_HEADER,
} from '@catalyst-monitor/core/node'
import crypto from 'crypto'

export const catalystErrorHandler: ErrorRequestHandler = (
  err,
  _req,
  res,
  next
) => {
  console.error(err)
  if (res.headersSent) {
    return next(err)
  }
  res.sendStatus(500)
}

export const catalystHandler: RequestHandler = (req, res, next) => {
  const start = new Date()

  const sessionId = req.headers[SESSION_ID_HEADER.toLowerCase()]
  const pageViewId = req.headers[PAGE_VIEW_ID_HEADER.toLowerCase()]
  const parentFetchId = req.headers[PARENT_FETCH_ID_HEADER.toLowerCase()]

  const store = {
    context: {
      fetchId: crypto.randomUUID(),
      sessionId: getHeader(sessionId) ?? crypto.randomUUID(),
      pageViewId: getHeader(pageViewId),
      parentFetchId: getHeader(parentFetchId),
    },
  }

  createCatalystContext(store, () => {
    try {
      res.on('finish', () => {
        const millisDiff = new Date().getTime() - start.getTime()

        getCatalystNode().recordFetch(
          {
            method: req.method,
            pathPattern: req.route?.path ?? 'Unknown',
            rawPath: req.path,
            args: req.params ?? {},
            statusCode: res.statusCode,
            duration: {
              seconds: Math.floor(millisDiff / 1000),
              nanos: (millisDiff % 1000) * 1000000,
            },
          },
          store.context
        )
      })
      next()
    } catch (e) {
      if (e instanceof Error) {
        getCatalystNode().recordError('error', e, store.context)
      } else {
        getCatalystNode().recordLog(
          {
            severity: 'error',
            args: {},
            message: '' + e,
            rawMessage: '' + e,
          },
          store.context
        )
      }
      throw e
    }
  })
}

function getHeader(val: string | string[] | undefined): string | undefined {
  if (Array.isArray(val) && val.length > 0) {
    return val[0]
  } else if (typeof val == 'string') {
    return val
  }
}
