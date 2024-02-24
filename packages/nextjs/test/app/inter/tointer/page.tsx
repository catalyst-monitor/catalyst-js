import Link from 'next/link'

export default function Page() {
  return (
    <main>
      <p>You have navigated directly to me!</p>
      <p>
        Try <Link href="/inter">going back</Link> and clicking the link to see
        the intercepted page!
      </p>
    </main>
  )
}
