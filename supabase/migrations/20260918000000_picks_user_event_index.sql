-- Supports history and live pick lookups constrained by user_id AND event_id.
-- Existing UNIQUE(user_id, fight_id) does not cover the event lookup.
-- Run this single statement outside a transaction (CONCURRENTLY requirement).
-- On production, inspect existing indexes first and schedule outside fight time;
-- concurrent creation allows writes but still consumes CPU and I/O.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_picks_user_event
  ON public.picks (user_id, event_id);
