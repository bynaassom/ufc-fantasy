import { z } from "zod";

export const adminEventSchema = z.object({
  name: z.string().min(1),
  location: z.string().optional().default(""),
  event_date: z.string().min(1),
  picks_lock_at: z.string().optional().default(""),
  picks_open_at: z.string().optional().default(""),
  banner_image_url: z.string().optional().default(""),
  ufc_event_id: z.string().optional().default(""),
  ufc_stats_url: z.string().optional().default(""),
  espn_fightcenter_url: z.string().optional().default(""),
  sherdog_event_url: z.string().optional().default(""),
  tapology_event_url: z.string().optional().default(""),
  status: z.enum(["upcoming", "live", "completed"]).optional(),
});

export const adminFightSchema = z.object({
  fighter_a: z.object({
    name: z.string().min(1),
    headshot_url: z.string().optional().default(""),
    country: z.string().optional().default(""),
  }),
  fighter_b: z.object({
    name: z.string().min(1),
    headshot_url: z.string().optional().default(""),
    country: z.string().optional().default(""),
  }),
  weight_class: z.string().min(1),
  is_title_fight: z.boolean(),
  total_rounds: z.number().int().min(3).max(5),
  card_type: z.string().min(1),
  fight_order: z.number().int().min(1),
});

export const adminFightPatchSchema = z.object({
  weight_class: z.string().optional(),
  card_type: z.string().optional(),
  is_title_fight: z.boolean().optional(),
  total_rounds: z.number().int().min(3).max(5).optional(),
  odds_a: z.string().nullable().optional(),
  odds_b: z.string().nullable().optional(),
  ufc_matchup_url: z.string().nullable().optional(),
});

export const adminFightReorderSchema = z.object({
  fightIds: z.array(z.string().uuid()).min(1),
});

export const adminFightOddsBatchSchema = z.object({
  updates: z.array(
    z.object({
      fightId: z.string().uuid(),
      odds_a: z.string().nullable(),
      odds_b: z.string().nullable(),
    }),
  ).min(1),
});

export const adminFightLinksBatchSchema = z.object({
  updates: z.array(
    z.object({
      fightId: z.string().uuid(),
      value: z.string().nullable(),
    }),
  ).min(1),
});

export const adminFightResultSchema = z.object({
  winner_side: z.enum(["a", "b"]),
  method: z.enum(["decision", "submission", "knockout"]),
  round: z.number().int().min(1).max(5),
});

export const adminRoleToggleSchema = z.object({
  currentRole: z.enum(["user", "admin"]),
});

export const adminBanToggleSchema = z.object({
  currentBan: z.boolean(),
});
