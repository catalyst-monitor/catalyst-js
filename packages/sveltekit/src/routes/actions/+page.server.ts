export const actions = {
  error: async () => {
    throw new Error('Server action error.')
  },
  log: async () => {
    console.log('Log from action')
  },
  random: async () => {
    const random = Math.random() * 6
    if (random >= 5) {
      throw new Error('Got random error!')
    }
    return { randomValue: random }
  }
}
