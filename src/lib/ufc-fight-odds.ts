const UFC_FIGHT_ODDS_BASE = "https://www.ufc.com.br/fight-odds";

export type UfcFightOdds = {
  fightId: string;
  red: string | null;
  blue: string | null;
  url: string;
};

function formatAmericanOdds(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;

  const price = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(price) || price === 0) return null;
  return price > 0 ? `+${price}` : String(price);
}

function normalizeFightId(fightId: string | number) {
  const normalized = String(fightId).trim();
  if (!/^\d+$/.test(normalized)) {
    throw new Error("FightId da UFC inválido");
  }
  return normalized;
}

export function buildUfcFightOddsUrl(fightId: string | number) {
  return `${UFC_FIGHT_ODDS_BASE}/${normalizeFightId(fightId)}`;
}

export function extractUfcFightId(value?: string | null) {
  if (!value) return null;

  try {
    const parsed = new URL(value, "https://www.ufc.com.br");
    const pathId = parsed.pathname.match(/\/fight-odds\/(\d+)\/?$/i)?.[1];
    if (pathId) return pathId;

    const hashId = parsed.hash.replace(/^#/, "").trim();
    return /^\d+$/.test(hashId) ? hashId : null;
  } catch {
    return null;
  }
}

export function parseUfcFightOddsPayload(
  payload: unknown,
  fightId: string | number,
): UfcFightOdds {
  const normalizedFightId = normalizeFightId(fightId);
  const data = payload as { red?: unknown; blue?: unknown } | null;

  if (!data || typeof data !== "object") {
    throw new Error("Resposta inválida das odds oficiais do UFC");
  }

  return {
    fightId: normalizedFightId,
    red: formatAmericanOdds(data.red),
    blue: formatAmericanOdds(data.blue),
    url: buildUfcFightOddsUrl(normalizedFightId),
  };
}

export async function fetchUfcFightOdds(fightId: string | number) {
  const url = buildUfcFightOddsUrl(fightId);
  const response = await fetch(url, {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`UFC.com odds HTTP ${response.status}`);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error("Resposta inválida das odds oficiais do UFC");
  }

  return parseUfcFightOddsPayload(payload, fightId);
}
