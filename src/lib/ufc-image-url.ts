/** Prefer the original UFC image over its small event-card thumbnail rendition. */
export function getUfcOriginalHeadshotUrl(value?: string | null) {
  if (!value) return null;

  try {
    const url = new URL(value);
    if (
      !["ufc.com", "www.ufc.com", "ufc.com.br", "www.ufc.com.br"].includes(
        url.hostname,
      )
    ) {
      return value;
    }

    url.pathname = url.pathname.replace(
      /\/styles\/event_fight_card_upper_body[^/]*\/(?:s3|public)\//i,
      "/",
    );
    return url.toString();
  } catch {
    return value;
  }
}
