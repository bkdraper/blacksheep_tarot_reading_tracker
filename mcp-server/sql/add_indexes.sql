-- Performance optimization indexes for query_readings function

-- Index on user_name for faster filtering (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_sessions_user_name 
ON blacksheep_reading_tracker_sessions (LOWER(user_name));

-- Index on session_date for date range queries
CREATE INDEX IF NOT EXISTS idx_sessions_date 
ON blacksheep_reading_tracker_sessions (session_date);

-- Composite index for user + date queries
CREATE INDEX IF NOT EXISTS idx_sessions_user_date 
ON blacksheep_reading_tracker_sessions (LOWER(user_name), session_date);

-- GIN index on readings JSONB for faster JSONB operations
CREATE INDEX IF NOT EXISTS idx_sessions_readings_gin 
ON blacksheep_reading_tracker_sessions USING GIN (readings);
