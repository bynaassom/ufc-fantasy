type Options = NonNullable<
  Parameters<typeof import("html-to-image").toBlob>[1]
>;

// A valid image is essential: the library's empty default rejects on image load.
export const SHARE_IMAGE_PLACEHOLDER =
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/%3E';

export async function captureShareImage(node: HTMLElement): Promise<Blob> {
  const { getFontEmbedCSS, toBlob } = await import("html-to-image");
  await Promise.race([
    document.fonts?.ready.catch(() => undefined),
    new Promise((resolve) => window.setTimeout(resolve, 3000)),
  ]);
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

  const options: Options = {
    width: Math.ceil(node.offsetWidth),
    height: Math.ceil(node.offsetHeight),
    pixelRatio: 2,
    backgroundColor: getComputedStyle(node).backgroundColor,
    // Don't invalidate signed/CDN URLs or fetch every image again on each export.
    cacheBust: false,
    includeQueryParams: true,
    imagePlaceholder: SHARE_IMAGE_PLACEHOLDER,
    fetchRequestInit: { signal: AbortSignal.timeout(10000) },
    style: {
      transform: "none",
      maxWidth: "none",
      margin: "0",
      boxShadow: "none",
    },
  };
  try {
    options.fontEmbedCSS = await getFontEmbedCSS(node, options);
  } catch {
    // A blocked font must not prevent sharing the user's result.
    options.fontEmbedCSS = "";
    options.skipFonts = true;
  }
  const blob = await toBlob(node, options);
  if (!blob || !blob.size) throw new Error("A imagem gerada está vazia.");
  return blob;
}
