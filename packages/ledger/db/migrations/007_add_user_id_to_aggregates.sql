-- migrate:up

DROP MATERIALIZED VIEW IF EXISTS llm_metrics_1h;

SELECT remove_retention_policy('llm_metrics_1m');
SELECT remove_continuous_aggregate_policy('llm_metrics_1m');
DROP MATERIALIZED VIEW IF EXISTS llm_metrics_1m;

CREATE INDEX idx_user_id ON llm_requests (user_id, timestamp DESC);

CREATE MATERIALIZED VIEW llm_metrics_1m
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 minute', timestamp) AS bucket,
    user_id,
    provider,
    model,
    category,
    count(*)                                                   AS request_count,
    avg(total_latency_ms)                                      AS avg_latency,
    percentile_agg(total_latency_ms)                           AS latency_pct,
    avg(ttft_ms)                                               AS avg_ttft,
    sum(input_tokens)                                          AS total_input_tokens,
    sum(reasoning_tokens)                                      AS total_reasoning_tokens,
    sum(output_tokens)                                         AS total_output_tokens,
    sum(input_cost_usd + reasoning_cost_usd + output_cost_usd) AS total_cost,
    count(*) FILTER (WHERE http_status_code >= 400)            AS error_count,
    count(*) FILTER (WHERE http_status_code = 429)             AS rate_limit_count
FROM llm_requests
GROUP BY bucket, user_id, provider, model, category
WITH NO DATA;

SELECT add_continuous_aggregate_policy('llm_metrics_1m',
    start_offset    => INTERVAL '1 hour',
    end_offset      => INTERVAL '1 minute',
    schedule_interval => INTERVAL '1 minute');

SELECT add_retention_policy('llm_metrics_1m', INTERVAL '30 days');

CREATE MATERIALIZED VIEW llm_metrics_1h
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 hour', bucket) AS bucket,
    user_id, provider, model, category,
    sum(request_count)            AS request_count,
    sum(total_input_tokens)       AS total_input_tokens,
    sum(total_reasoning_tokens)   AS total_reasoning_tokens,
    sum(total_output_tokens)      AS total_output_tokens,
    sum(total_cost)               AS total_cost,
    sum(error_count)              AS error_count
FROM llm_metrics_1m
GROUP BY time_bucket('1 hour', bucket), user_id, provider, model, category
WITH NO DATA;

-- migrate:down

DROP MATERIALIZED VIEW IF EXISTS llm_metrics_1h;

SELECT remove_retention_policy('llm_metrics_1m');
SELECT remove_continuous_aggregate_policy('llm_metrics_1m');
DROP MATERIALIZED VIEW IF EXISTS llm_metrics_1m;

DROP INDEX IF EXISTS idx_user_id;

CREATE MATERIALIZED VIEW llm_metrics_1m
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 minute', timestamp) AS bucket,
    provider,
    model,
    category,
    count(*)                                                   AS request_count,
    avg(total_latency_ms)                                      AS avg_latency,
    percentile_agg(total_latency_ms)                           AS latency_pct,
    avg(ttft_ms)                                               AS avg_ttft,
    sum(input_tokens)                                          AS total_input_tokens,
    sum(reasoning_tokens)                                      AS total_reasoning_tokens,
    sum(output_tokens)                                         AS total_output_tokens,
    sum(input_cost_usd + reasoning_cost_usd + output_cost_usd) AS total_cost,
    count(*) FILTER (WHERE http_status_code >= 400)            AS error_count,
    count(*) FILTER (WHERE http_status_code = 429)             AS rate_limit_count
FROM llm_requests
GROUP BY bucket, provider, model, category
WITH NO DATA;

SELECT add_continuous_aggregate_policy('llm_metrics_1m',
    start_offset    => INTERVAL '1 hour',
    end_offset      => INTERVAL '1 minute',
    schedule_interval => INTERVAL '1 minute');

SELECT add_retention_policy('llm_metrics_1m', INTERVAL '30 days');

CREATE MATERIALIZED VIEW llm_metrics_1h
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 hour', bucket) AS bucket,
    provider, model, category,
    sum(request_count)            AS request_count,
    sum(total_input_tokens)       AS total_input_tokens,
    sum(total_reasoning_tokens)   AS total_reasoning_tokens,
    sum(total_output_tokens)      AS total_output_tokens,
    sum(total_cost)               AS total_cost,
    sum(error_count)              AS error_count
FROM llm_metrics_1m
GROUP BY time_bucket('1 hour', bucket), provider, model, category
WITH NO DATA;
