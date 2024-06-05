import type { PageLoad } from './$types'

export const load: PageLoad = ({ params }) => {
  return {
    paramValue: params.test,
  }
}
