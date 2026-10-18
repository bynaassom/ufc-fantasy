type Options = NonNullable<
  Parameters<typeof import("html-to-image").toBlob>[1]
>;

// A valid image is essential: the library's empty default rejects on image load.
export const SHARE_IMAGE_PLACEHOLDER =
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/%3E';

export async function captureShareImage(node: HTMLElement): Promise<Blob> {
  const { getFontEmbedCSS, toBlob, toCanvas } = await import("html-to-image");
  await Promise.race([
    document.fonts?.ready.catch(() => undefined),
    new Promise((resolve) => window.setTimeout(resolve, 3000)),
  ]);
  // Let an image's onError handler switch to its fallback before cloning.
  // Two passes cover the optimized banner and its direct-source fallback.
  for (let pass = 0; pass < 2; pass++) {
    await Promise.race([
      Promise.all(
        Array.from(node.querySelectorAll("img"), (image) =>
          image.decode().catch(() => undefined),
        ),
      ),
      new Promise((resolve) => window.setTimeout(resolve, 10000)),
    ]);
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => resolve()),
    );
  }

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
  const rasters = Array.from(
    node.querySelectorAll<HTMLImageElement>("img[data-share-raster]"),
  );
  if (rasters.length) {
    // WebKit can omit raster images inside SVG foreignObject even after decode.
    // Keep their fixed layout boxes, then paint the photos directly on canvas.
    const photos = await Promise.all(
      rasters.map(async (element) => {
        const photo = new Image();
        photo.crossOrigin = "anonymous";
        photo.src = element.currentSrc || element.src;
        try {
          await decodePhoto(photo);
        } catch {
          // Preserve result sharing if an external host blocks CORS or stalls.
          return null;
        }
        return {
          element,
          photo,
          rect: element.getBoundingClientRect(),
          position: getComputedStyle(element).objectPosition,
        };
      }),
    );
    const root = node.getBoundingClientRect();
    const canvas = await toCanvas(node, {
      ...options,
      filter: (element) => !rasters.includes(element as HTMLImageElement),
    });
    const context = canvas.getContext("2d");
    if (!context || !root.width || !root.height)
      throw new Error("Não foi possível montar o card.");
    const scaleX = canvas.width / root.width;
    const scaleY = canvas.height / root.height;
    for (const entry of photos) {
      if (!entry) continue;
      const { photo, rect, position } = entry;
      const x = (rect.left - root.left) * scaleX;
      const y = (rect.top - root.top) * scaleY;
      const width = rect.width * scaleX;
      const height = rect.height * scaleY;
      const cover = Math.max(
        width / photo.naturalWidth,
        height / photo.naturalHeight,
      );
      const drawnWidth = photo.naturalWidth * cover;
      const drawnHeight = photo.naturalHeight * cover;
      const [horizontal = "50%", vertical = "50%"] = position.split(/\s+/);
      context.save();
      context.beginPath();
      context.rect(x, y, width, height);
      context.clip();
      context.drawImage(
        photo,
        x + imageOffset(horizontal, width - drawnWidth),
        y + imageOffset(vertical, height - drawnHeight),
        drawnWidth,
        drawnHeight,
      );
      context.restore();
    }
    return new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((blob) => {
        if (blob?.size) resolve(blob);
        else reject(new Error("A imagem gerada está vazia."));
      }, "image/png"),
    );
  }
  const blob = await toBlob(node, options);
  if (!blob || !blob.size) throw new Error("A imagem gerada está vazia.");
  return blob;
}

function imageOffset(position: string, available: number) {
  if (position === "left" || position === "top") return 0;
  if (position === "right" || position === "bottom") return available;
  if (position === "center") return available / 2;
  const amount = Number.parseFloat(position);
  if (!Number.isFinite(amount)) return available / 2;
  return position.endsWith("%") ? (available * amount) / 100 : amount;
}

function decodePhoto(photo: HTMLImageElement): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(
      () => reject(new Error("O banner demorou para carregar.")),
      10000,
    );
    photo.decode().then(
      () => {
        window.clearTimeout(timer);
        resolve();
      },
      (error: unknown) => {
        window.clearTimeout(timer);
        reject(error);
      },
    );
  });
}
