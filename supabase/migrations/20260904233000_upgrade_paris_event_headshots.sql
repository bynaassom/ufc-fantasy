-- Replace narrow fight-card thumbnails with the official 520x325 athlete headshots.
UPDATE fighters AS fighter
SET
  headshot_url = source.headshot_url,
  slug = COALESCE(fighter.slug, source.slug),
  updated_at = NOW()
FROM (
  VALUES
    ('Dan Hooker', 'dan-hooker', 'https://ufc.com/images/2026-09/HOOKER_DAN_09-05.png'),
    ('Daniil Donchenko', 'daniil-donchenko', 'https://ufc.com/images/2026-09/DONCHENKO_DANIIL_09-05.png'),
    ('Delphine Benouaich', 'delphine-benouaich', 'https://ufc.com/images/2026-09/BENOUAICH_DELPHINE_09-05.png'),
    ('Fabia Sintes', 'fabia-sintes', 'https://ufc.com/images/2026-09/SINTES_FABIA_09-05.png'),
    ('Farès Ziam', 'fares-ziam', 'https://ufc.com/images/2026-09/ZIAM_FARES_09-05.png'),
    ('Felipe Lima', 'felipe-lima', 'https://ufc.com/images/2026-09/LIMA_FELIPE_09-05.png'),
    ('Klaudia Sygula', 'klaudia-sygula', 'https://ufc.com/images/2026-09/SYGULA_KLAUDIA_09-05.png'),
    ('Luis Felipe Dias', 'luis-dias-de-assis', 'https://ufc.com/images/2026-09/DIAS_LUIS_FELIPE_09-05.png'),
    ('Matthieu Letho Duclos', 'matthieu-letho-duclos', 'https://ufc.com/images/2026-09/DUCLOS_MATTHIEU_09-05.png'),
    ('Michael Aljarouj', 'michael-aljarouj', 'https://ufc.com/images/2026-09/ALJAROUJ_MICHAEL_09-05.png'),
    ('Modestas Bukauskas', 'modestas-bukauskas', 'https://ufc.com/images/2026-09/BUKAUSKAS_MODESTAS_09-05.png'),
    ('Morgan Charriere', 'morgan-charriere', 'https://ufc.com/images/2026-09/CHARRIERE_MORGAN_09-05.png'),
    ('Muhammad Naimov', 'muhammad-naimov', 'https://ufc.com/images/2026-09/NAIMOV_MUHAMMAD_09-05.png'),
    ('Nora Cornolle', 'nora-cornolle', 'https://ufc.com/images/2026-09/CORNOLLE_NORA_09-05.png'),
    ('Nursulton Ruziboev', 'nursulton-ruziboev', 'https://ufc.com/images/2026-09/RUZIBOEV_NURSULTON_09-05.png'),
    ('Pavel Andrusca', 'pavel-andrusca', 'https://ufc.com/images/2026-09/ANDRUSCA_PAVEL_09-05.png'),
    ('Punahele Soriano', 'punahele-soriano', 'https://ufc.com/images/2026-09/SORIANO_PUNAHELE_09-05.png'),
    ('Ryan Spann', 'ryan-spann', 'https://ufc.com/images/2026-09/SPANN_RYAN_09-05.png'),
    ('Salahdine Parnasse', 'salahdine-parnasse', 'https://ufc.com/images/2026-09/PARNASSE_SALAHDINE_09-05.png'),
    ('Sofia Montenegro', 'sofia-montenegro', 'https://ufc.com/images/2026-09/MONTENEGRO_SOFIA_09-05.png'),
    ('Trevor Peek', 'trevor-peek', 'https://ufc.com/images/2026-09/PEEK_TREVOR_09-05.png')
) AS source(name, slug, headshot_url)
WHERE fighter.name = source.name;
