import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: false,
  },
  // The Neon serverless driver's WebSocket path pulls in `ws` and its
  // optional native addons (bufferutil, utf-8-validate). Left to Next's
  // bundler, these get processed/rewritten and the native binding breaks
  // ("bufferUtil.mask is not a function") the first time a request actually
  // reaches Neon over a live network. Marking them external makes Next
  // leave them as plain `require()`s resolved by Node at runtime instead.
  serverExternalPackages: ["@neondatabase/serverless", "ws", "bufferutil", "utf-8-validate"],
};

export default nextConfig;
