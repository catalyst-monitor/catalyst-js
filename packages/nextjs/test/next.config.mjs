import * as catalystConfig from '@catalyst-monitor/nextjs/config'
import catalyst from './catalyst.mjs'

/** @type {import('next').NextConfig} */
export default catalystConfig.withCatalystConfig(
  {
    // Strict Mode causes effects to be ran twice.
    // Since Catalyst sometimes runs in effects, this causes
    // double-reporting of events.
    reactStrictMode: false,
  },
  catalyst
)
