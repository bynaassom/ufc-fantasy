-- Complete the remaining active-card identities. UFC currently publishes
-- official silhouette assets for three of these athletes, so those images are
-- intentionally preserved until an official portrait becomes available.

UPDATE public.fighters SET
  country = 'Estados Unidos',
  slug = 'melissa-amaya',
  updated_at = NOW()
WHERE id = 'db141180-f7fa-4a19-b9ec-29e82de8db93';

UPDATE public.fighters SET
  country = 'Brasil',
  slug = 'valesca-machado',
  updated_at = NOW()
WHERE id = '68603879-4520-49fa-ad03-e4197fdd8ee6';

UPDATE public.fighters SET
  country = 'Azerbaijão',
  slug = 'mehemmedeli-osmanli',
  updated_at = NOW()
WHERE id = '0e1abe26-d53c-45bb-97cc-25e37360a2f0';

UPDATE public.fighters SET
  country = 'Quirguistão',
  slug = 'ilimbek-akylbek-uulu',
  updated_at = NOW()
WHERE id = 'd2f7659b-eb29-4a3d-8520-fa23af656fd1';
