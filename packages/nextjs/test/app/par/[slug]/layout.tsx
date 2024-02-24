export default function Layout({
  children,
  panel,
}: {
  children: React.ReactNode
  panel: React.ReactNode
}) {
  return (
    <main>
      {children}
      {panel}
    </main>
  )
}
