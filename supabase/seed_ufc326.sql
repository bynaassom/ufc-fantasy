-- ============================================================
-- UFC 326 — HOLLOWAY X OLIVEIRA 2
-- Rode isso no Supabase SQL Editor após o schema.sql
-- Data: 07/03/2026 · T-Mobile Arena, Las Vegas
-- ============================================================

-- ── LUTADORES ──────────────────────────────────────────────

INSERT INTO fighters (id, name, headshot_url, country) VALUES
  -- Card Principal
  ('11111111-0001-0000-0000-000000000001', 'Max Holloway',       'https://dmxg5wxfqgb4u.cloudfront.net/styles/athlete_bio_full_body/s3/2024-10/HOLLOWAY_MAX_L_BELT.png',  'Estados Unidos'),
  ('11111111-0002-0000-0000-000000000001', 'Charles Oliveira',   'https://dmxg5wxfqgb4u.cloudfront.net/styles/athlete_bio_full_body/s3/2024-05/OLIVEIRA_CHARLES_L_06-01.png', 'Brasil'),
  ('11111111-0003-0000-0000-000000000001', 'Caio Borralho',      'https://dmxg5wxfqgb4u.cloudfront.net/styles/athlete_bio_full_body/s3/2024-10/BORRALHO_CAIO_L_10-26.png', 'Brasil'),
  ('11111111-0004-0000-0000-000000000001', 'Reinier de Ridder',  'https://dmxg5wxfqgb4u.cloudfront.net/styles/athlete_bio_full_body/s3/2023-09/DE_RIDDER_REINIER_L_09-09.png', 'Holanda'),
  ('11111111-0005-0000-0000-000000000001', 'Ciryl Gane',         'https://dmxg5wxfqgb4u.cloudfront.net/styles/athlete_bio_full_body/s3/2024-04/GANE_CIRYL_L_04-13.png', 'França'),
  ('11111111-0006-0000-0000-000000000001', 'Alexander Volkov',   'https://dmxg5wxfqgb4u.cloudfront.net/styles/athlete_bio_full_body/s3/2023-10/VOLKOV_ALEXANDER_L_10-28.png', 'Rússia'),
  ('11111111-0007-0000-0000-000000000001', 'Mackenzie Dern',     'https://dmxg5wxfqgb4u.cloudfront.net/styles/athlete_bio_full_body/s3/2024-03/DERN_MACKENZIE_L_03-16.png', 'Estados Unidos'),
  ('11111111-0008-0000-0000-000000000001', 'Loopy Godinez',      'https://dmxg5wxfqgb4u.cloudfront.net/styles/athlete_bio_full_body/s3/2023-11/GODINEZ_LUPITA_L_11-11.png', 'México'),
  -- Preliminares
  ('11111111-0009-0000-0000-000000000001', 'Cody Brundage',      'https://dmxg5wxfqgb4u.cloudfront.net/styles/athlete_bio_full_body/s3/2022-11/BRUNDAGE_CODY_L_11-05.png', 'Estados Unidos'),
  ('11111111-0010-0000-0000-000000000001', 'Warlley Alves',      'https://dmxg5wxfqgb4u.cloudfront.net/styles/athlete_bio_full_body/s3/2021-04/ALVES_WARLLEY_L_04-10.png', 'Brasil'),
  ('11111111-0011-0000-0000-000000000001', 'Ricky Glenn',        'https://dmxg5wxfqgb4u.cloudfront.net/styles/athlete_bio_full_body/s3/2023-06/GLENN_RICKY_L_06-24.png', 'Estados Unidos'),
  ('11111111-0012-0000-0000-000000000001', 'Drakkar Klose',      'https://dmxg5wxfqgb4u.cloudfront.net/styles/athlete_bio_full_body/s3/2023-09/KLOSE_DRAKKAR_L_09-16.png', 'Estados Unidos'),
  ('11111111-0013-0000-0000-000000000001', 'Ariane Lipski',      'https://dmxg5wxfqgb4u.cloudfront.net/styles/athlete_bio_full_body/s3/2022-12/LIPSKI_ARIANE_L_12-10.png', 'Brasil'),
  ('11111111-0014-0000-0000-000000000001', 'Mariya Agapova',     'https://dmxg5wxfqgb4u.cloudfront.net/styles/athlete_bio_full_body/s3/2022-10/AGAPOVA_MARIYA_L_10-01.png', 'Cazaquistão'),
  ('11111111-0015-0000-0000-000000000001', 'Chris Curtis',       'https://dmxg5wxfqgb4u.cloudfront.net/styles/athlete_bio_full_body/s3/2023-04/CURTIS_CHRIS_L_04-08.png', 'Estados Unidos'),
  ('11111111-0016-0000-0000-000000000001', 'Phil Rowe',          'https://dmxg5wxfqgb4u.cloudfront.net/styles/athlete_bio_full_body/s3/2023-03/ROWE_PHIL_L_03-04.png', 'Estados Unidos')
ON CONFLICT (id) DO NOTHING;

-- ── EVENTO ─────────────────────────────────────────────────

INSERT INTO events (id, name, slug, event_date, location, banner_image_url, ufc_event_id, status)
VALUES (
  'aaaaaaaa-0326-0000-0000-000000000001',
  'UFC 326',
  'ufc-326',
  '2026-03-08 02:00:00+00',  -- 23h horário de Brasília
  'T-Mobile Arena, Las Vegas, NV',
  'https://dmxg5wxfqgb4u.cloudfront.net/styles/event_fight_card_upper_body_of_2/s3/2025-02/326-HollowayOliveira-EventPage-Hero-1920x1080.jpg',
  'ufc-326',
  'upcoming'
)
ON CONFLICT (slug) DO NOTHING;

-- ── LUTAS ──────────────────────────────────────────────────

INSERT INTO fights (event_id, fighter_a_id, fighter_b_id, card_type, fight_order, weight_class, is_title_fight, total_rounds)
VALUES
  -- CARD PRINCIPAL
  ('aaaaaaaa-0326-0000-0000-000000000001', '11111111-0001-0000-0000-000000000001', '11111111-0002-0000-0000-000000000001', 'main', 1, 'Lightweight',       true,  5),
  ('aaaaaaaa-0326-0000-0000-000000000001', '11111111-0003-0000-0000-000000000001', '11111111-0004-0000-0000-000000000001', 'main', 2, 'Middleweight',      false, 3),
  ('aaaaaaaa-0326-0000-0000-000000000001', '11111111-0005-0000-0000-000000000001', '11111111-0006-0000-0000-000000000001', 'main', 3, 'Heavyweight',       false, 3),
  ('aaaaaaaa-0326-0000-0000-000000000001', '11111111-0007-0000-0000-000000000001', '11111111-0008-0000-0000-000000000001', 'main', 4, 'Strawweight',       false, 3),
  -- PRELIMINARES
  ('aaaaaaaa-0326-0000-0000-000000000001', '11111111-0009-0000-0000-000000000001', '11111111-0010-0000-0000-000000000001', 'preliminary', 1, 'Middleweight',  false, 3),
  ('aaaaaaaa-0326-0000-0000-000000000001', '11111111-0011-0000-0000-000000000001', '11111111-0012-0000-0000-000000000001', 'preliminary', 2, 'Lightweight',   false, 3),
  ('aaaaaaaa-0326-0000-0000-000000000001', '11111111-0013-0000-0000-000000000001', '11111111-0014-0000-0000-000000000001', 'preliminary', 3, 'Flyweight',     false, 3),
  ('aaaaaaaa-0326-0000-0000-000000000001', '11111111-0015-0000-0000-000000000001', '11111111-0016-0000-0000-000000000001', 'preliminary', 4, 'Welterweight',  false, 3);

-- ── VERIFICAÇÃO ────────────────────────────────────────────
SELECT e.name, e.status, e.event_date, COUNT(f.id) as total_lutas
FROM events e
LEFT JOIN fights f ON f.event_id = e.id
WHERE e.slug = 'ufc-326'
GROUP BY e.name, e.status, e.event_date;
