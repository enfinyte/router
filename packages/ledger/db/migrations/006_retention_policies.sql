-- migrate:up
SELECT add_retention_policy('llm_requests', INTERVAL '7 days');
SELECT add_retention_policy('llm_metrics_1m', INTERVAL '30 days');

-- migrate:down
SELECT remove_retention_policy('llm_metrics_1m');
SELECT remove_retention_policy('llm_requests');
