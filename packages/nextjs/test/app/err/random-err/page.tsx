import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default function Page() {
  if (Math.random() > 0.5) {
    throw new Error('A random error occurred!')
  }
  return (
    <main>
      <p>No error occurred!</p>
      <p>
        <Link href="random-err" replace>
          Test your luck again!
        </Link>
      </p>
    </main>
  )
}
