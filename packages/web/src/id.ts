export function newId(bytes: number) {
  const array = new Uint8Array(bytes)
  crypto.getRandomValues(array)
  let id = ''
  for (const byte of array) {
    id += byte.toString(16).padStart(2, '0')
  }
  return id
}
