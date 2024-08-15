import CatalystNextJS from '@catalyst-monitor/nextjs'
import catalyst from './catalyst.mjs'

export async function register() {
  CatalystNextJS.start(catalyst)
}
