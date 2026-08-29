import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// キャッシュ(ISR)はR2バケットを用意すれば有効化できるが、
// このアプリは全ページforce-dynamicのため現時点では未使用。
export default defineCloudflareConfig({});
