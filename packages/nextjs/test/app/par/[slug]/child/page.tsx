export const dynamic = 'force-dynamic'

const Page = ({ params }: { params: { slug: string } }) => {
  return (
    <div>
      <p>Your dynamic param is:</p>
      <pre>{params.slug}</pre>
      <p>This is a nested parallel route!</p>
    </div>
  )
}
export default Page
