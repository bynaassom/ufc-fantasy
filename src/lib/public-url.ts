export function normalizePublicOrigin(value?: string | null) {
  const raw = (value || "").trim().replace(/\/+$/, "");
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;

  const isLocal = /^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(raw);
  return `${isLocal ? "http" : "https"}://${raw}`;
}

export function buildPublicUrl(path: string, origin?: string | null) {
  if (/^https?:\/\//i.test(path)) return path;
  const normalizedOrigin = normalizePublicOrigin(origin);
  if (!normalizedOrigin) return path;
  return `${normalizedOrigin}${path.startsWith("/") ? path : `/${path}`}`;
}
