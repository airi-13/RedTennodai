/** @type {import('next').NextConfig} */
const nextConfig = {
  // Cloudflare Images等の追加設定なしでnext/imageを使うため最適化を無効化
  images: {
    unoptimized: true,
  },
};

export default nextConfig;

import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();
