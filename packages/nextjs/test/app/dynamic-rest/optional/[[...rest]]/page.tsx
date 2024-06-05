export const dynamic = 'force-dynamic'

export default function Page({ params }: { params: { rest?: string[] } }) {
  return (
    <div>
      <p>Your dynamic parameters are:</p>

      {params.rest?.map((r, i) => <pre key={i}>{r}</pre>) ?? (
        <div>Not populated!</div>
      )}
    </div>
  )
}
