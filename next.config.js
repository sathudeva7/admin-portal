/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Agora SDK is browser-only — prevent SSR bundling errors
      config.externals.push('agora-rtc-sdk-ng')
    }
    return config
  },
}

module.exports = nextConfig
