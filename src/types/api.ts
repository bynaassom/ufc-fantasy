import type {
  Challenge,
  FightMethod,
  Notification,
  Profile,
  PublicProfileStats,
  PublicProfileSummary,
} from "@/types";

export type ApiSuccess<T> = {
  ok: true;
  data: T;
};

export type ApiFailure = {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export type MeResponse = {
  profile: Profile;
};

export type UpdateMyProfilePayload = {
  nickname: string;
};

export type PendingPickInput = {
  fightId: string;
  winnerId: string;
  method: FightMethod;
  round: number;
};

export type SaveEventPicksPayload = {
  picks: PendingPickInput[];
};

export type SaveEventPicksResponse = {
  savedCount: number;
};

export type CreateChallengePayload = {
  challengedId: string;
  eventId: string;
};

export type ChallengeActionPayload = {
  action: "accept" | "decline";
};

export type ChallengeResponse = {
  challenge: Challenge;
};

export type NotificationsResponse = {
  notifications: Notification[];
  unreadCount: number;
};

export type PublicProfileResponse = {
  profile: PublicProfileSummary;
  stats: PublicProfileStats;
  currentEvent: {
    id: string;
    name: string;
    slug: string;
    picks_lock_at: string;
  } | null;
  existingChallenge: Challenge | null;
  canChallenge: boolean;
};

export type AdminEventPayload = {
  name: string;
  location?: string;
  event_date: string;
  picks_lock_at?: string;
  picks_open_at?: string;
  banner_image_url?: string;
  ufc_stats_url?: string;
  status?: "upcoming" | "live" | "completed";
};

export type AdminFightPayload = {
  fighter_a: {
    name: string;
    headshot_url?: string;
    country?: string;
  };
  fighter_b: {
    name: string;
    headshot_url?: string;
    country?: string;
  };
  weight_class: string;
  is_title_fight: boolean;
  total_rounds: number;
  card_type: string;
  fight_order: number;
};

export type AdminFightPatchPayload = Partial<{
  weight_class: string;
  card_type: string;
  is_title_fight: boolean;
  total_rounds: number;
  odds_a: string | null;
  odds_b: string | null;
  ufc_matchup_url: string | null;
}>;

export type AdminEventFightValueUpdate = {
  fightId: string;
  value: string | null;
};

export type AdminEventFightOddsUpdate = {
  fightId: string;
  odds_a: string | null;
  odds_b: string | null;
};

export type AdminFightResultPayload = {
  winner_side: "a" | "b";
  method: FightMethod;
  round: number;
};
