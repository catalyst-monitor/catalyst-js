'use client'

import { catalystNextJSFetch as cFetch } from '@catalyst-monitor/nextjs'
import { useState } from 'react'

export default function ClientPage({ param }: { param: string }) {
  const [clientResp, setClientResp] = useState('')

  return (
    <>
      <div
        onClick={async () => {
          const resp = await cFetch(`/fetch/${param}/testapi`)
          const json = await resp.json()
          setClientResp(json.value)
        }}
      >
        Fetch on the client
      </div>
      <div>Resp from client: {clientResp}</div>
    </>
  )
}
