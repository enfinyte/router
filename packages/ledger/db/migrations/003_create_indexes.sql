-- migrate:up
CREATE INDEX idx_provider_model ON llm_requests (provider, model, timestamp DESC);
CREATE INDEX idx_category ON llm_requests (category, timestamp DESC);
CREATE INDEX idx_status ON llm_requests (http_status_code, timestamp DESC);

-- migrate:down
DROP INDEX IF EXISTS idx_status;
DROP INDEX IF EXISTS idx_category;
DROP INDEX IF EXISTS idx_provider_model;
