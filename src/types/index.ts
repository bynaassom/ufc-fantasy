import type { CompetitiveDivision } from "@/lib/ufc-weight";

export type FightMethod = "decision" | "submission" | "knockout";
export type EventStatus = "upcoming" | "live" | "completed";
export type FightCardType = "main" | "preliminary";
export type UserRole = "user" | "admin";
export type ChallengeStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "expired"
  | "completed";
export type NotificationType =
  | "challenge_received"
  | "challenge_accepted"
  | "challenge_declined"
  | "challenge_result"
  | "picks_opened"
  | "picks_closing_tomorrow"
  | "picks_closing_today"
  | "picks_closing_1h"
  | "picks_closing_30m"
  | "picks_closing_15m"
  | "picks_closed"
  | "fight_removed"
  | "fight_added"
  | "card_updated"
  | "perfect_pick";

export interface Profile {
  id: string;
  nickname: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  is_banned: boolean;
  ban_reason?: string;
  total_points: number;
  division: CompetitiveDivision;
  division_confirmed: boolean;
  created_at: string;
  updated_at: string;
}

export interface PublicProfileSummary {
  id: string;
  nickname: string;
  first_name: string;
  last_name: string;
  total_points: number;
}

export interface Event {
  id: string;
  name: string;
  slug: string;
  event_date: string;
  location?: string;
  banner_image_url?: string;
  ufc_event_id?: string | null;
  status: EventStatus;
  picks_lock_at: string;
  picks_open_at: string | null;
  ufc_stats_url?: string | null;
  espn_fightcenter_url?: string | null;
  sherdog_event_url?: string | null;
  tapology_event_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Fighter {
  id: string;
  name: string;
  ufc_fighter_id?: string;
  headshot_url?: string;
  country?: string;
  created_at: string;
  updated_at: string;
}

export interface Fight {
  id: string;
  event_id: string;
  fighter_a_id: string;
  fighter_b_id: string;
  card_type: FightCardType;
  fight_order: number;
  weight_class: string;
  is_title_fight: boolean;
  total_rounds: 3 | 5;
  winner_id?: string;
  result_method?: FightMethod;
  result_round?: number;
  result_confirmed: boolean;
  odds_a?: string | null;
  odds_b?: string | null;
  ufc_matchup_url?: string | null;
  fighter_a?: Fighter;
  fighter_b?: Fighter;
  winner?: Fighter;
}

export interface Pick {
  id: string;
  user_id: string;
  fight_id: string;
  event_id: string;
  picked_winner_id: string;
  picked_method: FightMethod;
  picked_round: number;
  is_confirmed: boolean;
  confirmed_at?: string;
  points_winner: number;
  points_method: number;
  points_round: number;
  total_points: number;
  created_at: string;
  updated_at: string;
}

export interface EventScore {
  id: string;
  user_id: string;
  event_id: string;
  total_points: number;
  fights_scored: number;
  rank_position?: number;
  updated_at: string;
  profile?: Profile;
}

export interface ActivityLog {
  id: string;
  user_id?: string;
  action: string;
  details?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  suspicious: boolean;
  created_at: string;
  profile?: Profile;
}

export interface Challenge {
  id: string;
  event_id: string;
  challenger_id: string;
  challenged_id: string;
  status: ChallengeStatus;
  winner_user_id?: string | null;
  responded_at?: string | null;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
  event?: Event | null;
  challenger?: PublicProfileSummary | null;
  challenged?: PublicProfileSummary | null;
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  target_path?: string | null;
  challenge_id?: string | null;
  event_id?: string | null;
  fight_id?: string | null;
  dedupe_key?: string | null;
  read_at?: string | null;
  created_at: string;
}

export interface PushSubscriptionRecord {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PublicProfileStats {
  challenges_total: number;
  challenges_won: number;
  pick_accuracy: number;
  average_rank: number | null;
}

export interface FightWithFighters extends Fight {
  fighter_a: Fighter;
  fighter_b: Fighter;
}

export interface EventWithFights extends Event {
  fights: FightWithFighters[];
}

export interface ChallengeFightComparison {
  fight: FightWithFighters;
  challengerPick?: Pick | null;
  challengedPick?: Pick | null;
}

export interface RankingEntry {
  rank: number;
  profile: Profile;
  points: number;
  event_id?: string;
}

export interface UserPicks {
  [fight_id: string]: {
    winner_id: string;
    method: FightMethod;
    round: number;
    confirmed: boolean;
  };
}
