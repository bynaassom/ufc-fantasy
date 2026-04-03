-- ============================================================
-- SEED: UFC 326 + UFC Fight Night: Evloev vs. Murphy
-- Fonte: ufc.com / cbssports / mmamania / wikipedia
-- Rode APÓS o schema_fixed.sql e fix_new_user.sql
-- ============================================================

-- ──────────────────────────────────────────────────────────
-- LUTADORES — UFC 326
-- ──────────────────────────────────────────────────────────
INSERT INTO fighters (id, name, headshot_url, country) VALUES
  -- MAIN CARD
  ('f0000001-0326-0000-0000-000000000001', 'Max Holloway',
   'https://dmxg5wxfqgb4u.cloudfront.net/styles/athlete_bio_full_body/s3/2024-10/HOLLOWAY_MAX_L_BELT.png', 'Estados Unidos'),
  ('f0000002-0326-0000-0000-000000000001', 'Charles Oliveira',
   'https://dmxg5wxfqgb4u.cloudfront.net/styles/athlete_bio_full_body/s3/2024-05/OLIVEIRA_CHARLES_L_06-01.png', 'Brasil'),
  ('f0000003-0326-0000-0000-000000000001', 'Caio Borralho',
   'https://dmxg5wxfqgb4u.cloudfront.net/styles/athlete_bio_full_body/s3/2024-10/BORRALHO_CAIO_L_10-26.png', 'Brasil'),
  ('f0000004-0326-0000-0000-000000000001', 'Reinier de Ridder',
   'https://dmxg5wxfqgb4u.cloudfront.net/styles/athlete_bio_full_body/s3/2023-09/DE_RIDDER_REINIER_L_09-09.png', 'Holanda'),
  ('f0000005-0326-0000-0000-000000000001', 'Raul Rosas Jr.',
   'https://dmxg5wxfqgb4u.cloudfront.net/styles/athlete_bio_full_body/s3/2024-06/ROSAS_JR_RAUL_L_06-22.png', 'Estados Unidos'),
  ('f0000006-0326-0000-0000-000000000001', 'Rob Font',
   'https://dmxg5wxfqgb4u.cloudfront.net/styles/athlete_bio_full_body/s3/2023-10/FONT_ROB_L_10-14.png', 'Estados Unidos'),
  ('f0000007-0326-0000-0000-000000000001', 'Drew Dober',
   'https://dmxg5wxfqgb4u.cloudfront.net/styles/athlete_bio_full_body/s3/2023-03/DOBER_DREW_L_03-04.png', 'Estados Unidos'),
  ('f0000008-0326-0000-0000-000000000001', 'Michael Johnson',
   'https://dmxg5wxfqgb4u.cloudfront.net/styles/athlete_bio_full_body/s3/2022-07/JOHNSON_MICHAEL_L_07-23.png', 'Estados Unidos'),
  ('f0000009-0326-0000-0000-000000000001', 'Gregory Rodrigues',
   'https://dmxg5wxfqgb4u.cloudfront.net/styles/athlete_bio_full_body/s3/2023-11/RODRIGUES_GREGORY_L_11-18.png', 'Brasil'),
  ('f0000010-0326-0000-0000-000000000001', 'Brunno Ferreira',
   'https://dmxg5wxfqgb4u.cloudfront.net/styles/athlete_bio_full_body/s3/2024-05/FERREIRA_BRUNNO_L_05-11.png', 'Brasil'),
  -- PRELIMS
  ('f0000011-0326-0000-0000-000000000001', 'Cody Garbrandt',
   'https://dmxg5wxfqgb4u.cloudfront.net/styles/athlete_bio_full_body/s3/2024-06/GARBRANDT_CODY_L_06-22.png', 'Estados Unidos'),
  ('f0000012-0326-0000-0000-000000000001', 'Xiao Long',
   'https://dmxg5wxfqgb4u.cloudfront.net/styles/athlete_bio_full_body/s3/2024-08/LONG_XIAO_L_08-03.png', 'China'),
  ('f0000013-0326-0000-0000-000000000001', 'Donte Johnson',
   'https://dmxg5wxfqgb4u.cloudfront.net/styles/athlete_bio_full_body/s3/2024-10/JOHNSON_DONTE_L_10-05.png', 'Estados Unidos'),
  ('f0000014-0326-0000-0000-000000000001', 'Cody Brundage',
   'https://dmxg5wxfqgb4u.cloudfront.net/styles/athlete_bio_full_body/s3/2022-11/BRUNDAGE_CODY_L_11-05.png', 'Estados Unidos'),
  ('f0000015-0326-0000-0000-000000000001', 'Ricky Turcios',
   'https://dmxg5wxfqgb4u.cloudfront.net/styles/athlete_bio_full_body/s3/2023-04/TURCIOS_RICKY_L_04-08.png', 'Estados Unidos'),
  ('f0000016-0326-0000-0000-000000000001', 'Alberto Montes',
   'https://dmxg5wxfqgb4u.cloudfront.net/styles/athlete_bio_full_body/s3/2024-11/MONTES_ALBERTO_L.png', 'Venezuela'),
  -- EARLY PRELIMS
  ('f0000017-0326-0000-0000-000000000001', 'Cody Durden',
   'https://dmxg5wxfqgb4u.cloudfront.net/styles/athlete_bio_full_body/s3/2023-07/DURDEN_CODY_L_07-29.png', 'Estados Unidos'),
  ('f0000018-0326-0000-0000-000000000001', 'Nyamjargal Tumendemberel',
   'https://dmxg5wxfqgb4u.cloudfront.net/styles/athlete_bio_full_body/s3/2024-07/TUMENDEMBEREL_NYAMJARGAL_L.png', 'Mongólia'),
  ('f0000019-0326-0000-0000-000000000001', 'Rafael Tobias',
   'https://dmxg5wxfqgb4u.cloudfront.net/styles/athlete_bio_full_body/s3/2024-09/TOBIAS_RAFAEL_L.png', 'Brasil'),
  ('f0000020-0326-0000-0000-000000000001', 'Diyar Nurgozhay',
   'https://dmxg5wxfqgb4u.cloudfront.net/styles/athlete_bio_full_body/s3/2024-11/NURGOZHAY_DIYAR_L.png', 'Cazaquistão'),
  ('f0000021-0326-0000-0000-000000000001', 'Sumudaerji',
   'https://dmxg5wxfqgb4u.cloudfront.net/styles/athlete_bio_full_body/s3/2023-10/SUMUDAERJI_L_10-14.png', 'China'),
  ('f0000022-0326-0000-0000-000000000001', 'Jesus Aguilar',
   'https://dmxg5wxfqgb4u.cloudfront.net/styles/athlete_bio_full_body/s3/2024-05/AGUILAR_JESUS_L.png', 'México'),
  ('f0000023-0326-0000-0000-000000000001', 'Luke Fernandez',
   'https://dmxg5wxfqgb4u.cloudfront.net/styles/athlete_bio_full_body/s3/2024-10/FERNANDEZ_LUKE_L.png', 'Austrália'),
  ('f0000024-0326-0000-0000-000000000001', 'Rodolfo Bellato',
   'https://dmxg5wxfqgb4u.cloudfront.net/styles/athlete_bio_full_body/s3/2024-03/BELLATO_RODOLFO_L_03-30.png', 'Brasil')
ON CONFLICT (id) DO NOTHING;

-- ──────────────────────────────────────────────────────────
-- EVENTO: UFC 326
-- ──────────────────────────────────────────────────────────
INSERT INTO events (id, name, slug, event_date, location, banner_image_url, ufc_event_id, status)
VALUES (
  'e0000001-0326-0000-0000-000000000001',
  'UFC 326',
  'ufc-326',
  '2026-03-08 02:00:00+00',
  'T-Mobile Arena, Las Vegas, NV',
  'https://dmxg5wxfqgb4u.cloudfront.net/styles/event_fight_card_upper_body_of_2/s3/2025-12/326-Holloway-Oliveira-EventListing-1080x608-BK.jpg',
  'ufc-326',
  'upcoming'
) ON CONFLICT (slug) DO NOTHING;

-- ──────────────────────────────────────────────────────────
-- LUTAS: UFC 326
-- ──────────────────────────────────────────────────────────
INSERT INTO fights (event_id, fighter_a_id, fighter_b_id, card_type, fight_order, weight_class, is_title_fight, total_rounds)
VALUES
  -- MAIN CARD (fight_order: posição no card, 1 = main event)
  ('e0000001-0326-0000-0000-000000000001', 'f0000001-0326-0000-0000-000000000001', 'f0000002-0326-0000-0000-000000000001', 'main', 1, 'Lightweight',   true,  5), -- Holloway vs Oliveira (BMF)
  ('e0000001-0326-0000-0000-000000000001', 'f0000003-0326-0000-0000-000000000001', 'f0000004-0326-0000-0000-000000000001', 'main', 2, 'Middleweight',  false, 3), -- Borralho vs De Ridder
  ('e0000001-0326-0000-0000-000000000001', 'f0000005-0326-0000-0000-000000000001', 'f0000006-0326-0000-0000-000000000001', 'main', 3, 'Bantamweight',  false, 3), -- Rosas Jr vs Font
  ('e0000001-0326-0000-0000-000000000001', 'f0000007-0326-0000-0000-000000000001', 'f0000008-0326-0000-0000-000000000001', 'main', 4, 'Lightweight',   false, 3), -- Dober vs Johnson
  ('e0000001-0326-0000-0000-000000000001', 'f0000009-0326-0000-0000-000000000001', 'f0000010-0326-0000-0000-000000000001', 'main', 5, 'Middleweight',  false, 3), -- Rodrigues vs Ferreira
  -- PRELIMS
  ('e0000001-0326-0000-0000-000000000001', 'f0000011-0326-0000-0000-000000000001', 'f0000012-0326-0000-0000-000000000001', 'preliminary', 1, 'Bantamweight',  false, 3), -- Garbrandt vs Xiao Long
  ('e0000001-0326-0000-0000-000000000001', 'f0000013-0326-0000-0000-000000000001', 'f0000014-0326-0000-0000-000000000001', 'preliminary', 2, 'Middleweight',  false, 3), -- D. Johnson vs Brundage
  ('e0000001-0326-0000-0000-000000000001', 'f0000015-0326-0000-0000-000000000001', 'f0000016-0326-0000-0000-000000000001', 'preliminary', 3, 'Featherweight', false, 3), -- Turcios vs Montes
  -- EARLY PRELIMS
  ('e0000001-0326-0000-0000-000000000001', 'f0000017-0326-0000-0000-000000000001', 'f0000018-0326-0000-0000-000000000001', 'early_preliminary', 1, 'Flyweight',       false, 3), -- Durden vs Tumendemberel
  ('e0000001-0326-0000-0000-000000000001', 'f0000019-0326-0000-0000-000000000001', 'f0000020-0326-0000-0000-000000000001', 'early_preliminary', 2, 'LightHeavyweight',false, 3), -- Tobias vs Nurgozhay
  ('e0000001-0326-0000-0000-000000000001', 'f0000021-0326-0000-0000-000000000001', 'f0000022-0326-0000-0000-000000000001', 'early_preliminary', 3, 'Flyweight',       false, 3), -- Sumudaerji vs Aguilar
  ('e0000001-0326-0000-0000-000000000001', 'f0000023-0326-0000-0000-000000000001', 'f0000024-0326-0000-0000-000000000001', 'early_preliminary', 4, 'LightHeavyweight',false, 3); -- Fernandez vs Bellato


-- ══════════════════════════════════════════════════════════
-- LUTADORES — UFC Fight Night: Evloev vs. Murphy (UFC London)
-- ══════════════════════════════════════════════════════════
INSERT INTO fighters (id, name, headshot_url, country) VALUES
  -- MAIN CARD
  ('f0000001-fn270-0000-0000-000000000001', 'Movsar Evloev',
   'https://dmxg5wxfqgb4u.cloudfront.net/styles/athlete_bio_full_body/s3/2024-09/EVLOEV_MOVSAR_L_09-28.png', 'Rússia'),
  ('f0000002-fn270-0000-0000-000000000001', 'Lerone Murphy',
   'https://dmxg5wxfqgb4u.cloudfront.net/styles/athlete_bio_full_body/s3/2024-07/MURPHY_LERONE_L_07-27.png', 'Reino Unido'),
  ('f0000003-fn270-0000-0000-000000000001', 'Luke Riley',
   'https://dmxg5wxfqgb4u.cloudfront.net/styles/athlete_bio_full_body/s3/2024-09/RILEY_LUKE_L.png', 'Reino Unido'),
  ('f0000004-fn270-0000-0000-000000000001', 'Michael Aswell',
   'https://dmxg5wxfqgb4u.cloudfront.net/styles/athlete_bio_full_body/s3/2024-11/ASWELL_MICHAEL_L.png', 'Reino Unido'),
  ('f0000005-fn270-0000-0000-000000000001', 'Roman Dolidze',
   'https://dmxg5wxfqgb4u.cloudfront.net/styles/athlete_bio_full_body/s3/2024-03/DOLIDZE_ROMAN_L_03-30.png', 'Geórgia'),
  ('f0000006-fn270-0000-0000-000000000001', 'Christian Leroy Duncan',
   'https://dmxg5wxfqgb4u.cloudfront.net/styles/athlete_bio_full_body/s3/2024-04/DUNCAN_CHRISTIAN_L_04-27.png', 'Reino Unido'),
  ('f0000007-fn270-0000-0000-000000000001', 'Iwo Baraniewski',
   'https://dmxg5wxfqgb4u.cloudfront.net/styles/athlete_bio_full_body/s3/2024-11/BARANIEWSKI_IWO_L.png', 'Polônia'),
  ('f0000008-fn270-0000-0000-000000000001', 'Austen Lane',
   'https://dmxg5wxfqgb4u.cloudfront.net/styles/athlete_bio_full_body/s3/2023-11/LANE_AUSTEN_L_11-04.png', 'Estados Unidos'),
  ('f0000009-fn270-0000-0000-000000000001', 'Michael Page',
   'https://dmxg5wxfqgb4u.cloudfront.net/styles/athlete_bio_full_body/s3/2024-09/PAGE_MICHAEL_L_09-14.png', 'Reino Unido'),
  ('f0000010-fn270-0000-0000-000000000001', 'Sam Patterson',
   'https://dmxg5wxfqgb4u.cloudfront.net/styles/athlete_bio_full_body/s3/2024-10/PATTERSON_SAM_L.png', 'Reino Unido'),
  -- PRELIMS
  ('f0000011-fn270-0000-0000-000000000001', 'Kurtis Campbell',
   'https://dmxg5wxfqgb4u.cloudfront.net/styles/athlete_bio_full_body/s3/2024-06/CAMPBELL_KURTIS_L.png', 'Irlanda'),
  ('f0000012-fn270-0000-0000-000000000001', 'Danny Silva',
   'https://dmxg5wxfqgb4u.cloudfront.net/styles/athlete_bio_full_body/s3/2024-07/SILVA_DANNY_L.png', 'Reino Unido'),
  ('f0000013-fn270-0000-0000-000000000001', 'Mason Jones',
   'https://dmxg5wxfqgb4u.cloudfront.net/styles/athlete_bio_full_body/s3/2024-01/JONES_MASON_L_01-13.png', 'País de Gales'),
  ('f0000014-fn270-0000-0000-000000000001', 'Axel Sola',
   'https://dmxg5wxfqgb4u.cloudfront.net/styles/athlete_bio_full_body/s3/2024-09/SOLA_AXEL_L.png', 'França'),
  ('f0000015-fn270-0000-0000-000000000001', 'Shanelle Dyer',
   'https://dmxg5wxfqgb4u.cloudfront.net/styles/athlete_bio_full_body/s3/2024-08/DYER_SHANELLE_L.png', 'Canadá'),
  ('f0000016-fn270-0000-0000-000000000001', 'Ravena Oliveira',
   'https://dmxg5wxfqgb4u.cloudfront.net/styles/athlete_bio_full_body/s3/2024-09/OLIVEIRA_RAVENA_L.png', 'Brasil'),
  ('f0000017-fn270-0000-0000-000000000001', 'Nathaniel Wood',
   'https://dmxg5wxfqgb4u.cloudfront.net/styles/athlete_bio_full_body/s3/2024-02/WOOD_NATHANIEL_L_02-17.png', 'Reino Unido'),
  ('f0000018-fn270-0000-0000-000000000001', 'Losene Keita',
   'https://dmxg5wxfqgb4u.cloudfront.net/styles/athlete_bio_full_body/s3/2024-05/KEITA_LOSENE_L.png', 'Suécia'),
  -- EARLY PRELIMS
  ('f0000019-fn270-0000-0000-000000000001', 'Louie Sutherland',
   'https://dmxg5wxfqgb4u.cloudfront.net/styles/athlete_bio_full_body/s3/2024-10/SUTHERLAND_LOUIE_L.png', 'Escócia'),
  ('f0000020-fn270-0000-0000-000000000001', 'Brando Pericic',
   'https://dmxg5wxfqgb4u.cloudfront.net/styles/athlete_bio_full_body/s3/2024-08/PERICIC_BRANDO_L.png', 'Croácia'),
  ('f0000021-fn270-0000-0000-000000000001', 'Antonio Trocoli',
   'https://dmxg5wxfqgb4u.cloudfront.net/styles/athlete_bio_full_body/s3/2024-06/TROCOLI_ANTONIO_L.png', 'Brasil'),
  ('f0000022-fn270-0000-0000-000000000001', 'Mantas Kondratavičius',
   'https://dmxg5wxfqgb4u.cloudfront.net/styles/athlete_bio_full_body/s3/2024-09/KONDRATAVIČIUS_MANTAS_L.png', 'Lituânia'),
  ('f0000023-fn270-0000-0000-000000000001', 'Mick Parkin',
   'https://dmxg5wxfqgb4u.cloudfront.net/styles/athlete_bio_full_body/s3/2023-09/PARKIN_MICK_L_09-09.png', 'Reino Unido'),
  ('f0000024-fn270-0000-0000-000000000001', 'Felipe Franco',
   'https://dmxg5wxfqgb4u.cloudfront.net/styles/athlete_bio_full_body/s3/2024-11/FRANCO_FELIPE_L.png', 'Brasil'),
  ('f0000025-fn270-0000-0000-000000000001', 'Shaqueme Rock',
   'https://dmxg5wxfqgb4u.cloudfront.net/styles/athlete_bio_full_body/s3/2024-10/ROCK_SHAQUEME_L.png', 'Estados Unidos'),
  ('f0000026-fn270-0000-0000-000000000001', 'Abubakar Al-Selwady',
   'https://dmxg5wxfqgb4u.cloudfront.net/styles/athlete_bio_full_body/s3/2024-08/AL-SELWADY_ABUBAKAR_L.png', 'Reino Unido'),
  ('f0000027-fn270-0000-0000-000000000001', 'Melissa Mullins',
   'https://dmxg5wxfqgb4u.cloudfront.net/styles/athlete_bio_full_body/s3/2024-09/MULLINS_MELISSA_L.png', 'Estados Unidos'),
  ('f0000028-fn270-0000-0000-000000000001', 'Luana Carolina',
   'https://dmxg5wxfqgb4u.cloudfront.net/styles/athlete_bio_full_body/s3/2023-04/CAROLINA_LUANA_L_04-08.png', 'Brasil')
ON CONFLICT (id) DO NOTHING;

-- ──────────────────────────────────────────────────────────
-- EVENTO: UFC Fight Night: Evloev vs. Murphy (UFC London)
-- ──────────────────────────────────────────────────────────
INSERT INTO events (id, name, slug, event_date, location, banner_image_url, ufc_event_id, status)
VALUES (
  'e0000002-0f27-0000-0000-000000000001',
  'UFC Fight Night: Evloev vs. Murphy',
  'ufc-fn-evloev-murphy',
  '2026-03-21 17:00:00+00',  -- 4pm ET main card / 1pm ET prelims
  'O2 Arena, Londres, Inglaterra',
  'https://dmxg5wxfqgb4u.cloudfront.net/styles/event_fight_card_upper_body_of_2/s3/2025-12/FN270-Evloev-Murphy-EventListing-1080x608-BK.jpg',
  'ufc-fn-march-21-2026',
  'upcoming'
) ON CONFLICT (slug) DO NOTHING;

-- ──────────────────────────────────────────────────────────
-- LUTAS: UFC Fight Night: Evloev vs. Murphy
-- ──────────────────────────────────────────────────────────
INSERT INTO fights (event_id, fighter_a_id, fighter_b_id, card_type, fight_order, weight_class, is_title_fight, total_rounds)
VALUES
  -- MAIN CARD
  ('e0000002-0f27-0000-0000-000000000001', 'f0000001-fn270-0000-0000-000000000001', 'f0000002-fn270-0000-0000-000000000001', 'main', 1, 'Featherweight', false, 5), -- Evloev vs Murphy
  ('e0000002-0f27-0000-0000-000000000001', 'f0000003-fn270-0000-0000-000000000001', 'f0000004-fn270-0000-0000-000000000001', 'main', 2, 'Featherweight', false, 3), -- Riley vs Aswell
  ('e0000002-0f27-0000-0000-000000000001', 'f0000005-fn270-0000-0000-000000000001', 'f0000006-fn270-0000-0000-000000000001', 'main', 3, 'Middleweight',  false, 3), -- Dolidze vs Duncan
  ('e0000002-0f27-0000-0000-000000000001', 'f0000007-fn270-0000-0000-000000000001', 'f0000008-fn270-0000-0000-000000000001', 'main', 4, 'LightHeavyweight', false, 3), -- Baraniewski vs Lane
  ('e0000002-0f27-0000-0000-000000000001', 'f0000009-fn270-0000-0000-000000000001', 'f0000010-fn270-0000-0000-000000000001', 'main', 5, 'Welterweight',  false, 3), -- Page vs Patterson
  -- PRELIMS
  ('e0000002-0f27-0000-0000-000000000001', 'f0000011-fn270-0000-0000-000000000001', 'f0000012-fn270-0000-0000-000000000001', 'preliminary', 1, 'Featherweight', false, 3), -- Campbell vs Silva
  ('e0000002-0f27-0000-0000-000000000001', 'f0000013-fn270-0000-0000-000000000001', 'f0000014-fn270-0000-0000-000000000001', 'preliminary', 2, 'Lightweight',  false, 3), -- Jones vs Sola
  ('e0000002-0f27-0000-0000-000000000001', 'f0000015-fn270-0000-0000-000000000001', 'f0000016-fn270-0000-0000-000000000001', 'preliminary', 3, 'Strawweight',  false, 3), -- Dyer vs R. Oliveira
  ('e0000002-0f27-0000-0000-000000000001', 'f0000017-fn270-0000-0000-000000000001', 'f0000018-fn270-0000-0000-000000000001', 'preliminary', 4, 'Featherweight', false, 3), -- Wood vs Keita
  -- EARLY PRELIMS
  ('e0000002-0f27-0000-0000-000000000001', 'f0000019-fn270-0000-0000-000000000001', 'f0000020-fn270-0000-0000-000000000001', 'early_preliminary', 1, 'Heavyweight',  false, 3), -- Sutherland vs Pericic
  ('e0000002-0f27-0000-0000-000000000001', 'f0000021-fn270-0000-0000-000000000001', 'f0000022-fn270-0000-0000-000000000001', 'early_preliminary', 2, 'Middleweight', false, 3), -- Trocoli vs Kondratavičius
  ('e0000002-0f27-0000-0000-000000000001', 'f0000023-fn270-0000-0000-000000000001', 'f0000024-fn270-0000-0000-000000000001', 'early_preliminary', 3, 'Heavyweight',  false, 3), -- Parkin vs Franco (Parkin substituído)
  ('e0000002-0f27-0000-0000-000000000001', 'f0000025-fn270-0000-0000-000000000001', 'f0000026-fn270-0000-0000-000000000001', 'early_preliminary', 4, 'Lightweight',  false, 3), -- Rock vs Al-Selwady
  ('e0000002-0f27-0000-0000-000000000001', 'f0000027-fn270-0000-0000-000000000001', 'f0000028-fn270-0000-0000-000000000001', 'early_preliminary', 5, 'Strawweight',  false, 3); -- Mullins vs L. Carolina


-- ──────────────────────────────────────────────────────────
-- VERIFICAÇÃO
-- ──────────────────────────────────────────────────────────
SELECT e.name, e.status, e.event_date, COUNT(f.id) AS total_lutas
FROM events e
LEFT JOIN fights f ON f.event_id = e.id
WHERE e.slug IN ('ufc-326', 'ufc-fn-evloev-murphy')
GROUP BY e.name, e.status, e.event_date
ORDER BY e.event_date;
