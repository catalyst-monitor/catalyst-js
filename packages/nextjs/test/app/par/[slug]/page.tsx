import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default function Page({ params }: { params: { slug: string } }) {
  return (
    <div>
      <p>Your dynamic param is:</p>
      <pre>{params.slug}</pre>
      <Link href={`${params.slug}/child`}>Try a nested parallel route!</Link>
    </div>
  )
}
