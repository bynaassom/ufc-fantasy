export async function inlineImageDataUrl(imageUrl?: string | null): Promise<string | null> {
  if (!imageUrl) return null;
  if (/^data:/i.test(imageUrl)) return imageUrl;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const resp = await fetch(imageUrl, { signal: AbortSignal.timeout(15000) });
      if (!resp.ok) continue;
      const buffer = await resp.arrayBuffer();
      const contentType = resp.headers.get("content-type") || "image/jpeg";
      const base64 = Buffer.from(buffer).toString("base64");
      return `data:${contentType};base64,${base64}`;
    } catch {
      continue;
    }
  }
  return null;
}
