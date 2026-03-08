export type FightMethod = "decision" | "submission" | "knockout";
export type EventStatus = "upcoming" | "live" | "completed";
export type FightCardType = "main" | "preliminary";
export type UserRole = "user" | "admin";

export interface Profile {
  id: string;
  nickname: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  is_banned: boolean;
  ban_reason?: string;
  total_points: number;
  created_at: string;
  updated_at: string;
}

export interface Event {
  id: string;
  name: string;
  slug: string;
  event_date: string;
  location?: string;
  banner_image_url?: string;
  ufc_event_id?: string;
  status: EventStatus;
  picks_lock_at: string;
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

export interface FightWithFighters extends Fight {
  fighter_a: Fighter;
  fighter_b: Fighter;
}

export interface EventWithFights extends Event {
  fights: FightWithFighters[];
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
