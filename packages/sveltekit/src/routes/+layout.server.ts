import { COOKIE_NAME, getUserName } from '../fakeAuth.server.js'

export function load({ cookies }) {
  const authToken = cookies.get(COOKIE_NAME)
  if (authToken == null) {
    return
  }

  const userName = getUserName(authToken)
  if (userName == null) {
    return
  }

  return {
    user: {
      id: authToken,
      userName,
    },
  }
}
