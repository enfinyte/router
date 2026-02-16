-- migrate:up
CREATE MATERIALIZED VIEW llm_metrics_1m
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 minute', timestamp) AS bucket,
    provider,
    model,
    category,
    count(*) AS request_count,
    avg(total_latency_ms) AS avg_latency,
    percentile_agg(total_latency_ms) AS latency_pct,
    avg(ttft_ms) AS avg_ttft,
    sum(input_tokens) AS total_input_tokens,
    sum(reasoning_tokens) AS total_reasoning_tokens,
    sum(output_tokens) AS total_output_tokens,
    sum(input_cost_usd + reasoning_cost_usd + output_cost_usd) AS total_cost,
    count(*) FILTER (WHERE http_status_code >= 400) AS error_count,
    count(*) FILTER (WHERE http_status_code = 429) AS rate_limit_count
FROM llm_requests
GROUP BY bucket, provider, model, category
WITH NO DATA;

SELECT add_continuous_aggregate_policy('llm_metrics_1m',
    start_offset => INTERVAL '1 hour',
    end_offset   => INTERVAL '1 minute',
    schedule_interval => INTERVAL '1 minute');

-- migrate:down
SELECT remove_continuous_aggregate_policy('llm_metrics_1m');
DROP MATERIALIZED VIEW IF EXISTS llm_metrics_1m;
