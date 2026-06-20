CREATE OR REPLACE VIEW ranking_profiles AS
  SELECT
    id,
    nickname,
    first_name,
    last_name,
    total_points,
    division,
    bio,
    favorite_fighter_id,
    followers_count,
    following_count
  FROM profiles
  WHERE is_banned = false;
