import CatalystVercel, {
  type CatalystConfig,
  type VercelOnlyConfig,
} from '@catalyst-monitor/server/vercel'
import { setConfig } from './config.js'
import { getPropagationHeaders } from './store.js'

export * from './server.js'
export { default as CatalystInstaller } from './CatalystInstaller.js'

const CatalystNextJS = {
  start(
    config: CatalystConfig &
      VercelOnlyConfig & { publicKey: string; clientBaseUrl: string }
  ) {
    setConfig(config)
    CatalystVercel.start({
      ...config,
      __catalystGetPropagationHeaders() {
        return (
          getPropagationHeaders() ??
          CatalystVercel.getReporter().getPropagationHeaders()
        )
      },
    })
  },
  getReporter() {
    CatalystVercel.getReporter()
  },
}
export default CatalystNextJS
