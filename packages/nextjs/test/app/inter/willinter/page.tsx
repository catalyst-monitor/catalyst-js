import Link from 'next/link'

export default function Page() {
  return (
    <main>
      <p>This page will intercept!</p>
      <Link href="./tointer">Intercept me!</Link>
    </main>
  )
}
