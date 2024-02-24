import { catalystNextJSFetch as cFetch } from '@catalyst-monitor/nextjs'
import ClientPage from './ClientPage'

export default async function Page({ params }: { params: { param: string } }) {
  const resp = await cFetch(
    `http://localhost:3000/fetch/${params.param}/testapi`
  )
  const json = await resp.json()

  return (
    <>
      <div>Test fetch. Server fetch: {json.value}</div>
      <ClientPage param={params.param} />
    </>
  )
}
