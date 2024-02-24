export async function GET(
  req: Request,
  { params }: { params: { param: string } }
) {
  if (params.param == 'err') {
    throw Error('Error from route handler!')
  }
  return Response.json({ value: `Hi from ${params.param}` })
}
