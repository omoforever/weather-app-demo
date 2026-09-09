import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  /**
   * Lets a phone on the same wifi load the dev server's hot-reload resources.
   *
   * Next blocks cross-origin requests to /_next/* in development by default, so
   * hitting the machine's LAN address from another device fails. This applies to
   * `next dev` only — it has no effect on a production build — and only names hosts
   * on the local network.
   *
   * If the laptop's LAN address changes (DHCP), update it here. `npm run dev` prints
   * the current one as "Network:".
   */
  allowedDevOrigins: ['192.168.1.73'],
}

export default nextConfig
