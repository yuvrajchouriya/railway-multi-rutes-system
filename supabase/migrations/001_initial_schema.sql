-- Stations table (pre-populated with ~500 major stations)
CREATE TABLE stations (
  id SERIAL PRIMARY KEY,
  code VARCHAR(10) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  state VARCHAR(50),
  is_junction BOOLEAN DEFAULT false,
  zone VARCHAR(10),                    -- Railway zone (CR, WR, NR, etc.)
  search_text TEXT GENERATED ALWAYS AS (
    lower(code || ' ' || name)
  ) STORED
);
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_stations_search ON stations USING gin(search_text gin_trgm_ops);
CREATE INDEX idx_stations_junction ON stations (is_junction) WHERE is_junction = true;

-- Junction stations (subset of stations, used for multi-hop routing)
-- Marked via is_junction flag + optional regional grouping
CREATE TABLE junction_regions (
  id SERIAL PRIMARY KEY,
  junction_code VARCHAR(10) REFERENCES stations(code),
  region VARCHAR(50),                  -- 'Central', 'South', 'North', etc.
  priority INT DEFAULT 0              -- Higher = tried first for connecting routes
);

-- Search history (for future Journey Watch feature)
CREATE TABLE search_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  from_station VARCHAR(10) NOT NULL,
  to_station VARCHAR(10) NOT NULL,
  journey_date DATE NOT NULL,
  searched_at TIMESTAMPTZ DEFAULT now(),
  results_summary JSONB               -- Cache of route tags found
);
