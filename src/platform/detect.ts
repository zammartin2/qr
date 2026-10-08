/**
 * Runtime feature detection (no Node/browser globals required).
 *
 * @packageDocumentation
 */

/**
 * Returns `true` when the runtime exposes the `CompressionStream` global
 * (Node.js 18+, Chrome 80+, Firefox 113+, Safari 16.4+, Deno 1.19+,
 * Cloudflare Workers — but not Vercel Edge Functions).
 *
 * @returns Whether `CompressionStream` is available
 */
export function hasCompressionStream(): boolean {
  return typeof CompressionStream === 'function';
}
