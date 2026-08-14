export type MainTab = "eventos" | "lutas" | "resultados" | "operacoes" | "badges" | "analytics" | "usuarios";

export type SubTab =
  | "evento-pendencias"
  | "evento-manual"
  | "evento-importar"
  | "evento-editar"
  | "lutas-nova"
  | "lutas-odds"
  | "lutas-links"
  | "res-auto"
  | "res-manual"
  | "ops-lote"
  | "ops-fighters"
  | "ops-fotos"
  | "ops-auditoria"
  | "badges-list"
  | "badges-novo"
  | "analytics"
  | "usuarios";

export interface FighterData {
  name: string;
  headshot_url: string;
  country: string;
}

export interface FightForm {
  fighter_a: FighterData;
  fighter_b: FighterData;
  weight_class: string;
  is_title_fight: boolean;
  total_rounds: number;
  card_type: string;
  fight_order: number;
}

export interface EventEditForm {
  name: string;
  location: string;
  event_date: string;
  prelims_start_at: string;
  timing_mode: "automatic" | "manual";
  picks_lock_at: string;
  picks_open_at: string;
  banner_image_url: string;
  banner_object_position: string;
  ufc_event_id: string;
  ufc_stats_url: string;
  espn_fightcenter_url: string;
  sherdog_event_url: string;
  tapology_event_url: string;
  status: "upcoming" | "live" | "completed";
}

export type SyncAction = "create" | "update" | "skip" | "error";

export type BulkAction =
  | "open_now"
  | "close_now"
  | "reset_default"
  | "set_offsets"
  | "set_status";
