export async function inlineImageDataUrl(imageUrl?: string | null): Promise<string | null> {
  if (!imageUrl) return null;
  if (/^data:/i.test(imageUrl)) return imageUrl;

  try {
    const resp = await fetch(imageUrl, { signal: AbortSignal.timeout(8000) });
    if (!resp.ok) return null;
    const buffer = await resp.arrayBuffer();
    const contentType = resp.headers.get("content-type") || "image/jpeg";
    const base64 = Buffer.from(buffer).toString("base64");
    return `data:${contentType};base64,${base64}`;
  } catch {
    return null;
  }
}
