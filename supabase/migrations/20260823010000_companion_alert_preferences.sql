alter type public.notification_type add value if not exists 'fight_result';

alter table public.fight_alert_subscriptions
  add column if not exists notify_up_next boolean not null default true,
  add column if not exists notify_starting boolean not null default true,
  add column if not exists notify_result boolean not null default false;

alter table public.fight_alert_subscriptions
  drop constraint if exists fight_alert_subscriptions_has_preference;

alter table public.fight_alert_subscriptions
  add constraint fight_alert_subscriptions_has_preference
  check (notify_up_next or notify_starting or notify_result);

comment on column public.fight_alert_subscriptions.notify_result is
  'Opt-in explícito: notificações de resultado podem conter spoilers.';
