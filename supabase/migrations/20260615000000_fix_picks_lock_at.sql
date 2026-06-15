-- Fix picks_lock_at: change from GENERATED ALWAYS to regular column
-- Cannot directly alter a GENERATED ALWAYS column, so we recreate it

ALTER TABLE events DROP COLUMN picks_lock_at;

ALTER TABLE events ADD COLUMN picks_lock_at TIMESTAMPTZ 
  DEFAULT NOW();

-- Set initial values based on event_date
UPDATE events SET picks_lock_at = event_date - INTERVAL '30 minutes' 
  WHERE picks_lock_at IS NULL;
