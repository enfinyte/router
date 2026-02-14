-- migrate:up
CREATE MATERIALIZED VIEW llm_metrics_1h
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 hour', bucket) AS bucket,
    provider, model, category,
    sum(request_count) AS request_count,
    sum(total_input_tokens) AS total_input_tokens,
    sum(total_reasoning_tokens) AS total_reasoning_tokens,
    sum(total_output_tokens) AS total_output_tokens,
    sum(total_cost) AS total_cost,
    sum(error_count) AS error_count
FROM llm_metrics_1m
GROUP BY time_bucket('1 hour', bucket), provider, model, category
WITH NO DATA;

-- migrate:down
DROP MATERIALIZED VIEW IF EXISTS llm_metrics_1h;
