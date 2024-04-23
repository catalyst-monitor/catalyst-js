const fakeUserDb: { [token: string]: string } = {
  a1b2c3: 'Parker',
  foobar: 'River',
  deadbeef: 'Rowan',
  def456: 'Avery',
}

export function getUserName(token: string): string | null {
  if (!(token in fakeUserDb)) {
    return null
  }
  return fakeUserDb[token]
}

export const COOKIE_NAME = 'session_token'
