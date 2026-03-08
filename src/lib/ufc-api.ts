// UFC unofficial API integration
// Uses the beta.ufc.com API for live event data

const UFC_API_BASE = "https://api.beta.ufc.com/v1";

export interface UFCEvent {
  id: string;
  name: string;
  date: string;
  location: string;
  image?: string;
  cards: UFCCard[];
}

export interface UFCCard {
  type: "main" | "preliminary";
  bouts: UFCBout[];
}

export interface UFCBout {
  id: string;
  fighters: UFCFighter[];
  weightClass: string;
  isTitleBout: boolean;
  scheduledRounds: number;
  result?: UFCResult;
}

export interface UFCFighter {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  headshot?: string;
  country?: string;
}

export interface UFCResult {
  winnerId: string;
  method: string;
  round: number;
  time: string;
}

export async function fetchUpcomingUFCEvents(): Promise<UFCEvent[]> {
  try {
    const response = await fetch(
      `${UFC_API_BASE}/events?status=upcoming&limit=5`,
      {
        next: { revalidate: 3600 },
        headers: { "Accept": "application/json" },
      }
    );
    if (!response.ok) throw new Error("Failed to fetch UFC events");
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error("UFC API error (upcoming events):", error);
    return [];
  }
}

export async function fetchUFCEvent(eventId: string): Promise<UFCEvent | null> {
  try {
    const response = await fetch(`${UFC_API_BASE}/events/${eventId}`, {
      next: { revalidate: 60 },
    });
    if (!response.ok) throw new Error("Failed to fetch event");
    const data = await response.json();
    return data.data || null;
  } catch (error) {
    console.error("UFC API error (event):", error);
    return null;
  }
}

export async function fetchFighterHeadshot(fighterId: string): Promise<string | null> {
  try {
    const response = await fetch(`${UFC_API_BASE}/athletes/${fighterId}`, {
      next: { revalidate: 86400 },
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.data?.image || null;
  } catch {
    return null;
  }
}

// Normalize method name from UFC API to our schema
export function normalizeMethod(method: string): "decision" | "submission" | "knockout" | null {
  const m = method?.toLowerCase() || "";
  if (m.includes("decision") || m.includes("dec")) return "decision";
  if (m.includes("submission") || m.includes("sub")) return "submission";
  if (m.includes("knockout") || m.includes("ko") || m.includes("tko")) return "knockout";
  return null;
}

export const WEIGHT_CLASSES = [
  "Strawweight",
  "Flyweight",
  "Bantamweight",
  "Featherweight",
  "Lightweight",
  "Welterweight",
  "Middleweight",
  "Light Heavyweight",
  "Heavyweight",
];

export const WEIGHT_CLASS_PT: Record<string, string> = {
  Strawweight: "Palha",
  Flyweight: "Mosca",
  Bantamweight: "Galo",
  Featherweight: "Pena",
  Lightweight: "Leve",
  Welterweight: "Meio-Médio",
  Middleweight: "Médio",
  "Light Heavyweight": "Meio-Pesado",
  Heavyweight: "Pesado",
};
