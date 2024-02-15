export const actions = {
  error: async () => {
    throw new Error('Server action error.')
  },
  log: async () => {
    console.log('Log from action')
  },
}
