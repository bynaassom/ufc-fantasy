create table if not exists public.anonymous_fight_alert_subscriptions (
  id uuid default uuid_generate_v4() primary key,
  anonymous_id uuid not null,
  event_id uuid not null references public.events(id) on delete cascade,
  fight_id uuid references public.fights(id) on delete cascade,
  notify_up_next boolean not null default true,
  notify_starting boolean not null default true,
  notify_result boolean not null default false,
  expires_at timestamptz not null default (now() + interval '180 days'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint anonymous_fight_alert_has_preference
    check (notify_up_next or notify_starting or notify_result)
);

create unique index if not exists idx_anonymous_fight_alert_event
  on public.anonymous_fight_alert_subscriptions(anonymous_id, event_id)
  where fight_id is null;

create unique index if not exists idx_anonymous_fight_alert_fight
  on public.anonymous_fight_alert_subscriptions(anonymous_id, event_id, fight_id)
  where fight_id is not null;

create index if not exists idx_anonymous_fight_alert_delivery
  on public.anonymous_fight_alert_subscriptions(event_id, fight_id, expires_at);

drop trigger if exists validate_anonymous_fight_alert_event
  on public.anonymous_fight_alert_subscriptions;
create trigger validate_anonymous_fight_alert_event
  before insert or update of event_id, fight_id
  on public.anonymous_fight_alert_subscriptions
  for each row execute function public.validate_fight_alert_event();

drop trigger if exists anonymous_fight_alert_updated_at
  on public.anonymous_fight_alert_subscriptions;
create trigger anonymous_fight_alert_updated_at
  before update on public.anonymous_fight_alert_subscriptions
  for each row execute function public.update_updated_at();

alter table public.anonymous_fight_alert_subscriptions enable row level security;

create table if not exists public.anonymous_push_subscriptions (
  id uuid default uuid_generate_v4() primary key,
  anonymous_id uuid not null,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_anonymous_push_subscriptions_identity
  on public.anonymous_push_subscriptions(anonymous_id);

drop trigger if exists anonymous_push_subscriptions_updated_at
  on public.anonymous_push_subscriptions;
create trigger anonymous_push_subscriptions_updated_at
  before update on public.anonymous_push_subscriptions
  for each row execute function public.update_updated_at();

alter table public.anonymous_push_subscriptions enable row level security;

create table if not exists public.anonymous_notification_deliveries (
  id uuid default uuid_generate_v4() primary key,
  anonymous_id uuid not null,
  type public.notification_type not null,
  event_id uuid not null references public.events(id) on delete cascade,
  fight_id uuid references public.fights(id) on delete cascade,
  dedupe_key text not null,
  created_at timestamptz not null default now(),
  unique(anonymous_id, dedupe_key)
);

create index if not exists idx_anonymous_notification_deliveries_event
  on public.anonymous_notification_deliveries(event_id, created_at);

alter table public.anonymous_notification_deliveries enable row level security;

comment on table public.anonymous_fight_alert_subscriptions is
  'Companion subscriptions identified only by an opaque first-party cookie.';
comment on column public.anonymous_fight_alert_subscriptions.notify_result is
  'Explicit spoiler opt-in; false by default.';
