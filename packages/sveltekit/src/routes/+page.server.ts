import { fail } from '@sveltejs/kit'
import { COOKIE_NAME, getUserName } from '../fakeAuth.server.js'

export const actions = {
  login: async ({ cookies, request }) => {
    const data = await request.formData()

    const token = data.get('authToken')?.toString()
    if (token == null) {
      return fail(400, { error: 'No data provided' })
    }

    const user = getUserName(token)
    if (user == null) {
      return fail(401, { error: `User with token '${token}' not found` })
    }
    cookies.set(COOKIE_NAME, token, { httpOnly: false, path: '/' })
  },
}
