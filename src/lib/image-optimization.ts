const OPTIMIZABLE_UFC_HOSTS = new Set([
  "ufc.com",
  "www.ufc.com",
  "ufc.com.br",
  "www.ufc.com.br",
]);

/**
 * Only route UFC's current image service through Next's optimizer.
 * Older third-party CDN URLs stay direct so a blocked origin cannot break the
 * optimizer response before the component's existing fallback can take over.
 */
export function shouldOptimizeRemoteImage(src: string): boolean {
  try {
    const url = new URL(src);
    return (
      url.protocol === "https:" &&
      url.port === "" &&
      OPTIMIZABLE_UFC_HOSTS.has(url.hostname) &&
      url.pathname.startsWith("/images/")
    );
  } catch {
    return false;
  }
}
