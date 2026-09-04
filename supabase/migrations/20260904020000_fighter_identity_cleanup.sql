-- Repair verified UFC athlete data, consolidate duplicate identities, and make
-- future admin merges atomic across every fighter reference.

CREATE OR REPLACE FUNCTION public.merge_fighter_records(
  p_primary_id UUID,
  p_duplicate_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_primary public.fighters%ROWTYPE;
  v_duplicate public.fighters%ROWTYPE;
  v_fights_as_a INTEGER;
  v_fights_as_b INTEGER;
  v_winner_refs INTEGER;
  v_picked_winner_refs INTEGER;
  v_favorite_fighter_refs INTEGER;
  v_headshot_url TEXT;
  v_country TEXT;
  v_ufc_fighter_id TEXT;
  v_slug TEXT;
BEGIN
  IF p_primary_id = p_duplicate_id THEN
    RAISE EXCEPTION 'Merge bloqueado: selecione dois lutadores diferentes';
  END IF;

  SELECT * INTO v_primary
  FROM public.fighters
  WHERE id = p_primary_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lutador principal não encontrado: %', p_primary_id;
  END IF;

  SELECT * INTO v_duplicate
  FROM public.fighters
  WHERE id = p_duplicate_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lutador duplicado não encontrado: %', p_duplicate_id;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.fights
    WHERE (fighter_a_id = p_primary_id AND fighter_b_id = p_duplicate_id)
       OR (fighter_a_id = p_duplicate_id AND fighter_b_id = p_primary_id)
  ) THEN
    RAISE EXCEPTION 'Merge bloqueado: os dois IDs aparecem na mesma luta';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.fights AS duplicate_fight
    JOIN public.fights AS primary_fight
      ON primary_fight.event_id = duplicate_fight.event_id
     AND primary_fight.id <> duplicate_fight.id
    WHERE p_duplicate_id IN (duplicate_fight.fighter_a_id, duplicate_fight.fighter_b_id)
      AND p_primary_id IN (primary_fight.fighter_a_id, primary_fight.fighter_b_id)
      AND CASE
            WHEN duplicate_fight.fighter_a_id = p_duplicate_id
              THEN duplicate_fight.fighter_b_id
            ELSE duplicate_fight.fighter_a_id
          END = CASE
            WHEN primary_fight.fighter_a_id = p_primary_id
              THEN primary_fight.fighter_b_id
            ELSE primary_fight.fighter_a_id
          END
  ) THEN
    RAISE EXCEPTION 'Merge bloqueado: criaria uma luta duplicada no mesmo evento';
  END IF;

  SELECT COUNT(*) INTO v_fights_as_a
  FROM public.fights WHERE fighter_a_id = p_duplicate_id;
  SELECT COUNT(*) INTO v_fights_as_b
  FROM public.fights WHERE fighter_b_id = p_duplicate_id;
  SELECT COUNT(*) INTO v_winner_refs
  FROM public.fights WHERE winner_id = p_duplicate_id;
  SELECT COUNT(*) INTO v_picked_winner_refs
  FROM public.picks WHERE picked_winner_id = p_duplicate_id;
  SELECT COUNT(*) INTO v_favorite_fighter_refs
  FROM public.profiles WHERE favorite_fighter_id = p_duplicate_id;

  v_headshot_url := CASE
    WHEN NULLIF(v_primary.headshot_url, '') IS NULL
      OR v_primary.headshot_url ~* '(silhouette|shadow_fighter)'
      THEN COALESCE(NULLIF(v_duplicate.headshot_url, ''), v_primary.headshot_url)
    ELSE v_primary.headshot_url
  END;
  v_country := COALESCE(NULLIF(v_primary.country, ''), NULLIF(v_duplicate.country, ''));
  v_ufc_fighter_id := COALESCE(v_primary.ufc_fighter_id, v_duplicate.ufc_fighter_id);
  v_slug := COALESCE(v_primary.slug, v_duplicate.slug);

  -- Historical picks are immutable to clients, but changing only the identity
  -- FK during an authorized merge must remain possible and auditable.
  PERFORM set_config('app.scoring_picks', 'on', true);

  UPDATE public.fights SET fighter_a_id = p_primary_id
  WHERE fighter_a_id = p_duplicate_id;
  UPDATE public.fights SET fighter_b_id = p_primary_id
  WHERE fighter_b_id = p_duplicate_id;
  UPDATE public.fights SET winner_id = p_primary_id
  WHERE winner_id = p_duplicate_id;
  UPDATE public.picks SET picked_winner_id = p_primary_id
  WHERE picked_winner_id = p_duplicate_id;
  UPDATE public.profiles SET favorite_fighter_id = p_primary_id
  WHERE favorite_fighter_id = p_duplicate_id;

  DELETE FROM public.fighters WHERE id = p_duplicate_id;

  UPDATE public.fighters
  SET
    headshot_url = v_headshot_url,
    country = v_country,
    ufc_fighter_id = v_ufc_fighter_id,
    slug = v_slug,
    updated_at = NOW()
  WHERE id = p_primary_id;

  RETURN jsonb_build_object(
    'primary_id', p_primary_id,
    'duplicate_id', p_duplicate_id,
    'fights_as_a', v_fights_as_a,
    'fights_as_b', v_fights_as_b,
    'winner_refs', v_winner_refs,
    'picked_winner_refs', v_picked_winner_refs,
    'favorite_fighter_refs', v_favorite_fighter_refs
  );
END;
$$;

REVOKE ALL ON FUNCTION public.merge_fighter_records(UUID, UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.merge_fighter_records(UUID, UUID)
  TO service_role;

-- Current cards: replace placeholders/missing media with the exact official
-- UFC card assets and preserve the official athlete slug as identity.
UPDATE public.fighters SET
  country = 'França',
  headshot_url = 'https://ufc.com/images/styles/event_fight_card_upper_body_of_standing_athlete/s3/2026-09/ALJAROUJ_MICHAEL_L_09-05.png?itok=6eoA2RZH',
  slug = 'michael-aljarouj',
  updated_at = NOW()
WHERE id = '6b0c24d9-a876-46c1-9e69-b1b7688fd430';

UPDATE public.fighters SET
  country = 'Espanha',
  headshot_url = 'https://ufc.com/images/styles/event_fight_card_upper_body_of_standing_athlete/s3/2026-09/SINTES_FABIA_R_09-05.png?itok=n3MiiZu4',
  slug = 'fabia-sintes',
  updated_at = NOW()
WHERE id = '11a0162c-8742-479f-ad18-7adf889fe8e9';

UPDATE public.fighters SET
  country = 'França',
  headshot_url = 'https://ufc.com/images/styles/event_fight_card_upper_body_of_standing_athlete/s3/2026-09/PARNASSE_SALAHDINE_R_09-05.png?itok=Gkl2iW_J',
  slug = 'salahdine-parnasse',
  updated_at = NOW()
WHERE id = '1db8ad76-8dec-45de-b6f8-5c4ffe7952ee';

UPDATE public.fighters SET
  country = 'Moldávia',
  headshot_url = 'https://ufc.com/images/styles/event_fight_card_upper_body_of_standing_athlete/s3/2026-09/ANDRUSCA_PAVEL_R_09-05.png?itok=SB8FngIq',
  slug = 'pavel-andrusca',
  updated_at = NOW()
WHERE id = '78a05dfd-770d-499a-a4f7-5b35d30d0e80';

UPDATE public.fighters SET
  headshot_url = 'https://ufc.com/images/styles/event_fight_card_upper_body_of_standing_athlete/s3/2026-07/STEVESON_GABLE_L_07-11.png?itok=eh09qXrC',
  slug = 'gable-steveson',
  updated_at = NOW()
WHERE id = '39f07cb9-0776-40bc-88e0-071436a6ed27';

UPDATE public.fighters SET
  name = 'Casey O''Neill',
  slug = 'casey-oneill',
  updated_at = NOW()
WHERE id = '5d8b0342-dc93-45a1-a8d1-1becd8c05b51';

UPDATE public.fighters SET
  country = 'Estados Unidos',
  slug = 'jose-miguel-delgado',
  updated_at = NOW()
WHERE id = 'a1000008-e014-0000-0000-000000000001';

UPDATE public.fighters SET
  country = 'Marrocos',
  slug = 'marwan-rahiki',
  updated_at = NOW()
WHERE id = 'a1000009-e014-0000-0000-000000000001';

-- Historical photo swaps and missing media confirmed against athlete pages.
UPDATE public.fighters SET
  country = 'Rússia',
  headshot_url = 'https://ufc.com/images/styles/athlete_bio_full_body/s3/2026-07/TUCHALOV_MAGOMED_L_07-25.png?itok=e_tKChrO',
  slug = 'magomed-tuchalov',
  updated_at = NOW()
WHERE id = '145ec153-25ab-4925-9003-f620b9c52dde';

UPDATE public.fighters SET
  country = 'Estados Unidos',
  headshot_url = 'https://ufc.com/images/styles/athlete_bio_full_body/s3/2026-07/HARRIS_RJ_L_07-18.png?itok=688ZICwh',
  slug = 'rj-harris',
  updated_at = NOW()
WHERE id = '6cdfc449-2847-4690-ae1f-7d9e1a316b19';

UPDATE public.fighters SET
  country = 'Estados Unidos',
  headshot_url = 'https://ufc.com/images/styles/athlete_bio_full_body/s3/2026-07/MELISANO_ANNA_L_07-18.png?itok=sw3Ky_bY',
  slug = 'anna-melisano',
  updated_at = NOW()
WHERE id = '679dbef2-e752-4077-a45f-45a762f43e62';

UPDATE public.fighters SET
  country = 'Brasil',
  headshot_url = 'https://ufc.com/images/styles/athlete_bio_full_body/s3/2026-03/THAINARA_ALEXIA_L_03-28.png?itok=Z448AVao',
  slug = 'alexia-thainara',
  updated_at = NOW()
WHERE id = '659dd574-a25a-4afd-aed4-dd8cedd18aa2';

UPDATE public.fighters SET
  country = 'Suécia',
  headshot_url = 'https://ufc.com/images/styles/athlete_bio_full_body/s3/2026-06/BERGGREN_THEODOR_R_06-27.png?itok=OcKsL0Tw',
  slug = 'theodor-berggren',
  updated_at = NOW()
WHERE id = 'f1503470-5606-4f0d-8852-4f6c254ed298';

UPDATE public.fighters SET
  country = 'Polônia',
  headshot_url = 'https://ufc.com/images/styles/athlete_bio_full_body/s3/2026-07/RZEPECKI_DAMIAN_R_07-25.png?itok=59CiDAGO',
  slug = 'damian-rzepecki',
  updated_at = NOW()
WHERE id = '8367c9a6-2af2-485c-a50e-35ae1bee8728';

-- Canonical identities. Slugs make future imports reuse the same row even
-- when UFC pages vary accents, capitalization, word order, or full names.
UPDATE public.fighters SET slug = 'brando-pericic', updated_at = NOW()
WHERE id = 'dc549ec0-4f93-434f-b44e-abd9c4577d1a';
UPDATE public.fighters SET slug = 'terrance-mckinney', updated_at = NOW()
WHERE id = '6d4e03fc-ef90-433e-9d53-84c7574f3538';
UPDATE public.fighters SET slug = 'tommy-mcmillen', updated_at = NOW()
WHERE id = 'eb867f4a-0962-482f-bee8-f8a954bd387b';
UPDATE public.fighters SET slug = 'mansur-abdul-malik', updated_at = NOW()
WHERE id = 'ec1f4ab0-335a-421b-8acc-169a8eb1db7a';
UPDATE public.fighters SET slug = 'jj-aldrich', updated_at = NOW()
WHERE id = '57435b48-c856-4648-8abe-c19efc5f3129';
UPDATE public.fighters SET slug = 'jackson-mcvey', updated_at = NOW()
WHERE id = '87c02425-1bc9-4705-bedd-9d0caacc4e20';
UPDATE public.fighters SET slug = 'jingnan-xiong', updated_at = NOW()
WHERE id = '8db8fdae-f392-431e-9e1c-dfd495230c9a';
UPDATE public.fighters SET slug = 'liu-ce', updated_at = NOW()
WHERE id = 'f0d5b07f-ddde-43e5-9d2c-d3afb4d5b5e6';
UPDATE public.fighters SET slug = 'patricio-pitbull-freire', updated_at = NOW()
WHERE id = '47698cb7-8a1f-4cb4-b0a5-b9f92fb63bd5';
UPDATE public.fighters SET slug = 'luis-dias-de-assis', updated_at = NOW()
WHERE id = '011db91b-72c9-40e6-9327-fa043848a732';
UPDATE public.fighters SET slug = 'jose-montanha-da-silva', updated_at = NOW()
WHERE id = 'f85849ea-8862-42c1-9147-fb57883a6f0d';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.picks
    WHERE fight_id IN (
      'f7307e17-6d65-4703-a011-1b8b99d0dc15',
      '6506952b-b300-4b73-af45-ca7f34ec80e3'
    )
  ) THEN
    RAISE EXCEPTION 'Limpeza do Noche UFC bloqueada: luta obsoleta já recebeu palpites';
  END IF;

  DELETE FROM public.fights
  WHERE id IN (
    'f7307e17-6d65-4703-a011-1b8b99d0dc15',
    '6506952b-b300-4b73-af45-ca7f34ec80e3'
  );

  -- Both rows represented Sutherland vs Montanha. Keep the later canonical
  -- row, remove its older duplicate picks, then recompute event and totals.
  IF EXISTS (
    SELECT 1 FROM public.fights
    WHERE id = '12a8f530-46ba-446b-b39b-5c056c42e30c'
  ) THEN
    PERFORM set_config('app.scoring_picks', 'on', true);
    DELETE FROM public.fights
    WHERE id = '12a8f530-46ba-446b-b39b-5c056c42e30c';
  END IF;

  PERFORM public.score_picks_for_fight('bc7411ec-e01d-4a9d-ac12-0d03b7a1a319');

  PERFORM public.merge_fighter_records('dc549ec0-4f93-434f-b44e-abd9c4577d1a', 'b5f223d4-cfc8-48e0-b1b0-703140ad3af3');
  PERFORM public.merge_fighter_records('6d4e03fc-ef90-433e-9d53-84c7574f3538', 'eaca7a7b-0df5-40ec-a863-3918deb2b6e3');
  PERFORM public.merge_fighter_records('eb867f4a-0962-482f-bee8-f8a954bd387b', 'd7a8d4e0-d566-434c-8993-e85495142e80');
  PERFORM public.merge_fighter_records('ec1f4ab0-335a-421b-8acc-169a8eb1db7a', '4928caa5-adfc-4751-8308-6bb4423c3dde');
  PERFORM public.merge_fighter_records('57435b48-c856-4648-8abe-c19efc5f3129', '96e9220f-a2bb-4e84-84bc-9cbbd3084865');
  PERFORM public.merge_fighter_records('87c02425-1bc9-4705-bedd-9d0caacc4e20', '9cfc822c-fad1-4d3d-9d0e-8c59e1589c26');
  PERFORM public.merge_fighter_records('8db8fdae-f392-431e-9e1c-dfd495230c9a', '211322c1-2eb2-434b-ad25-56050eae5631');
  PERFORM public.merge_fighter_records('f0d5b07f-ddde-43e5-9d2c-d3afb4d5b5e6', '2aa510f4-03b2-4f95-aa5c-215097d3f202');
  PERFORM public.merge_fighter_records('47698cb7-8a1f-4cb4-b0a5-b9f92fb63bd5', 'dea1cca3-13be-4403-9fb3-debd7b5d5aa5');
  PERFORM public.merge_fighter_records('011db91b-72c9-40e6-9327-fa043848a732', 'ad130763-c3ef-4716-8ca4-d48b17594d10');
  PERFORM public.merge_fighter_records('f85849ea-8862-42c1-9147-fb57883a6f0d', '35824e7b-6fcd-47ff-9781-cf69e4e495fa');

  UPDATE public.fighters
  SET name = 'Jingnan Xiong', updated_at = NOW()
  WHERE id = '8db8fdae-f392-431e-9e1c-dfd495230c9a';

  IF EXISTS (
    SELECT 1 FROM public.fights
    WHERE fighter_a_id IN ('d6696ab1-9368-4733-ab98-737f5bdde19f', '4cc113b8-26a3-4185-99de-c0d62614b335')
       OR fighter_b_id IN ('d6696ab1-9368-4733-ab98-737f5bdde19f', '4cc113b8-26a3-4185-99de-c0d62614b335')
       OR winner_id IN ('d6696ab1-9368-4733-ab98-737f5bdde19f', '4cc113b8-26a3-4185-99de-c0d62614b335')
  ) OR EXISTS (
    SELECT 1 FROM public.picks
    WHERE picked_winner_id IN ('d6696ab1-9368-4733-ab98-737f5bdde19f', '4cc113b8-26a3-4185-99de-c0d62614b335')
  ) OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE favorite_fighter_id IN ('d6696ab1-9368-4733-ab98-737f5bdde19f', '4cc113b8-26a3-4185-99de-c0d62614b335')
  ) THEN
    RAISE EXCEPTION 'Remoção de registros corrompidos bloqueada por referências';
  END IF;

  DELETE FROM public.fighters
  WHERE id IN (
    'd6696ab1-9368-4733-ab98-737f5bdde19f',
    '4cc113b8-26a3-4185-99de-c0d62614b335'
  );
END;
$$;
