-- Add api_cache table to store API responses
-- This is CRITICAL because free plan = only 10 API calls/month
CREATE TABLE api_cache (
  id SERIAL PRIMARY KEY,
  cache_key VARCHAR(255) NOT NULL,
  cache_type VARCHAR(50) NOT NULL,   -- 'train_search' | 'availability'
  response_data JSONB NOT NULL,
  cached_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(cache_key, cache_type)
);

-- Index for fast cache lookups
CREATE INDEX idx_api_cache_lookup ON api_cache (cache_key, cache_type, cached_at);

-- Auto-delete expired cache entries (optional, keeps DB clean)
-- Train search entries older than 24 hours
-- Availability entries older than 2 hours
