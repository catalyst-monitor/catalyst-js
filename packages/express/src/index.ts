import type { ErrorRequestHandler, RequestHandler } from 'express'
import Catalyst from '@catalyst-monitor/server'

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
  Catalyst.getReporter().recordServerAction(
    {
      method: req.method,
      pathPattern: req.route?.path ?? 'Unknown',
      rawPath: req.path,
      args: req.params ?? {},
      headers: req.headers,
    },
    (setStatusCode) => {
      return new Promise<void>((resolve) => {
        res.on('finish', () => {
          setStatusCode(res.statusCode)
          resolve()
        })
        next()
      })
    }
  )
}
