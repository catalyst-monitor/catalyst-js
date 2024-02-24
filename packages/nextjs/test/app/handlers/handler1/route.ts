import { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get('error') != null) {
    throw Error('Error from route handler!')
  }
  return Response.json({ value: 'Hi from GET' })
}

export const PUT = () => {
  return Response.json({ value: 'Hi from PUT' })
}

function postMethod() {
  return Response.json({ value: 'Hi from POST' })
}

export { postMethod as POST }
