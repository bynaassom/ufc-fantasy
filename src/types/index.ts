import type { CompetitiveDivision } from "@/lib/ufc-weight";

export interface UserFollow {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
}

export const ACTIVITY_TYPES = [
  "pick_submitted",
  "result_scored",
  "challenge_created",
  "challenge_accepted",
  "challenge_completed",
  "league_joined",
  "streak_milestone",
  "level_up",
] as const;

export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export interface UserActivity {
  id: string;
  user_id: string;
  type: ActivityType;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface ActivityFeedItem extends UserActivity {
  profile?: {
    nickname: string;
    first_name: string;
    last_name: string;
  };
}

export type ChallengeTemplateType = "beat_my_score" | "more_winners" | "use_my_picks";

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
  | "badge_earned"
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
  | "perfect_pick"
  | "event_completed";

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
  onboarding_completed: boolean;
  notification_preferences: NotificationPreferences;
  bio?: string | null;
  favorite_fighter_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PublicProfileSummary {
  id: string;
  nickname: string;
  first_name: string;
  last_name: string;
  total_points: number;
  bio?: string | null;
  favorite_fighter_id?: string | null;
  followers_count?: number;
  following_count?: number;
}

export interface Event {
  id: string;
  name: string;
  slug: string;
  event_date: string;
  location?: string;
  banner_image_url?: string;
  banner_object_position?: string;
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
  slug?: string;
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
  template_type?: ChallengeTemplateType | null;
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

export type NotificationPreferences = {
  picks_opened: boolean;
  picks_closed: boolean;
  picks_reminders: boolean;
  card_updated: boolean;
  perfect_pick: boolean;
  challenge_received: boolean;
  challenge_accepted: boolean;
  challenge_declined: boolean;
  challenge_result: boolean;
  badge_earned: boolean;
  event_completed: boolean;
};

export interface PublicProfileStats {
  challenges_total: number;
  challenges_won: number;
  pick_accuracy: number;
  average_rank: number | null;
  total_picks: number;
  events_played: number;
  avg_points_per_event: number;
  method_accuracy: number;
  round_accuracy: number;
  current_streak: number;
  best_streak: number;
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

export interface Season {
  id: string;
  name: string;
  starts_at: string;
  ends_at: string;
  is_current: boolean;
  created_at?: string;
}

export interface SeasonStandingEntry {
  season_id: string;
  user_id: string;
  nickname: string;
  first_name: string;
  last_name: string;
  total_points: number;
  perfect_picks: number;
  events_played: number;
  rank_position: number;
}

export interface GroupSeasonStandingEntry extends SeasonStandingEntry {
  group_id: string;
  role: "admin" | "member";
  joined_at: string;
}

export interface UserPicks {
  [fight_id: string]: {
    winner_id: string;
    method: FightMethod;
    round: number;
    confirmed: boolean;
  };
}

export interface Group {
  id: string;
  name: string;
  description: string | null;
  invite_code: string;
  created_by: string;
  created_at: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: "admin" | "member";
  joined_at: string;
  profile?: Profile;
}

export interface GroupWithMembers extends Group {
  members: GroupMember[];
  member_count: number;
}

export interface EnrichedGroup extends Group {
  member_count: number;
  champion: { nickname: string; total_points: number } | null;
  my_rank: number | null;
}

export type BadgeCategory = "volume" | "accuracy" | "streak" | "challenge" | "special";
export type BadgeAwardMode = "automatic" | "manual";

export interface Badge {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: BadgeCategory;
  icon_name: string;
  tier: number;
  sort_order: number;
  archived?: boolean;
  criteria_description?: string | null;
  award_mode?: BadgeAwardMode;
  notification_title?: string | null;
  notification_message?: string | null;
}

export interface Rivalry {
  id: string;
  user_id_a: string;
  user_id_b: string;
  user_a_wins: number;
  user_b_wins: number;
  draws: number;
  updated_at: string;
  created_at: string;
}

export interface UserBadge {
  id: string;
  user_id: string;
  badge_id: string;
  unlocked_at: string;
  badge?: Badge;
}

export interface BadgeWithStatus extends Badge {
  unlocked: boolean;
  unlocked_at?: string;
}

export interface EventRecapFightStat {
  fight_id: string;
  fighter_a_name: string;
  fighter_a_id: string;
  fighter_b_name: string;
  fighter_b_id: string;
  winner_id: string | null;
  result_method: string | null;
  result_round: number | null;
  result_confirmed: boolean;
  total_picks: number;
  pick_a_percent: number;
  pick_b_percent: number;
  perfect_pick_count: number;
}

export interface EventRecapData {
  event: import("@/types").EventWithFights;
  ranking: Array<{
    rank: number;
    user_id: string;
    nickname: string;
    total_points: number;
    perfect_picks: number;
  }>;
  aggregateStats: {
    total_players: number;
    average_score: number;
    best_score: number;
    total_perfect_picks: number;
  };
  fightStats: EventRecapFightStat[];
  nextEventSlug: string | null;
  xpEarned: number;
  xpAccuracy: number;
  leagueStandings?: LeagueRecapStanding[];
}

export interface ChatMessage {
  id: string;
  user_id: string;
  group_id?: string | null;
  content: string;
  is_hidden: boolean;
  hidden_by?: string | null;
  hidden_at?: string | null;
  created_at: string;
  profile?: {
    nickname: string;
    first_name: string;
    last_name: string;
    role: string;
  };
}

export interface XpEventMetadata {
  accuracy: number;
  method_acc: number;
  round_acc: number;
  fights_with_picks: number;
  correct_winners: number;
  correct_methods: number;
  correct_rounds: number;
}

export interface XpEvent {
  id: string;
  user_id: string;
  event_id: string;
  amount: number;
  reason: string;
  metadata: XpEventMetadata;
  created_at: string;
}

export interface XpSummary {
  xpTotal: number;
  level: number;
  levelTitle: string;
  currentStreak: number;
  bestStreak: number;
  nextLevelXp: number;
  progressToNextLevel: number;
}

export interface LeagueRecapMember {
  position: number;
  userId: string;
  name: string;
  nickname: string;
  totalPoints: number;
  eventXp: number;
  movement: "up" | "down" | "same" | "new";
  movementDelta: number;
  isCurrentUser: boolean;
}

export interface LeagueRecapStanding {
  groupId: string;
  groupName: string;
  members: LeagueRecapMember[];
}

export interface WinnerPickSplit {
  fighterId: string;
  name: string;
  count: number;
  pct: number;
}

export interface MethodPickSplit {
  method: string;
  count: number;
  pct: number;
}

export interface PickDistributionItem {
  fightId: string;
  winner_picks: WinnerPickSplit[];
  method_picks: MethodPickSplit[];
}

export interface ChallengeShareData {
  id: string;
  challenger: { name: string; nickname: string };
  challenged: { name: string; nickname: string };
  eventName: string;
  eventDate: string;
  templateType: string | null;
  templateLabel: string | null;
  status: "pending" | "accepted" | "completed" | "declined";
  result?: {
    winnerId: string | null;
    winnerNickname: string | null;
    challengerScore: number;
    challengedScore: number;
    isDraw: boolean;
  };
}
