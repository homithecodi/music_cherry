export const PROXY_PATH = "/api/proxy";

export function proxyRemoteUrl(originalUrl: string): string {
  return `${PROXY_PATH}?url=${encodeURIComponent(originalUrl)}`;
}

export function isProxySrc(src: string): boolean {
  return src.startsWith(PROXY_PATH);
}
