import { isAllowedScrapeUrl } from "@/lib/security";
import type { ResultSourceId, ResultSourceSet } from "@/lib/fight-result-sources";

export function blockedResultSource(
  source: ResultSourceId,
  label: string,
  url: string,
): ResultSourceSet | null {
  if (isAllowedScrapeUrl(url)) return null;

  return {
    source,
    label,
    url,
    results: [],
    error: "host ou protocolo não permitido",
  };
}
