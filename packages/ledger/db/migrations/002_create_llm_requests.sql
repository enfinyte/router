-- migrate:up
CREATE TABLE llm_requests (
    timestamp              TIMESTAMPTZ NOT NULL,
    request_id             UUID,
    provider               TEXT NOT NULL,
    model                  TEXT NOT NULL,
    category               TEXT,
    resolution_latency_ms  INT,
    ttft_ms                INT,
    total_latency_ms       INT,
    input_tokens           INT,
    reasoning_tokens       INT,
    output_tokens          INT,
    input_cost_usd         NUMERIC(12,8),
    reasoning_cost_usd     NUMERIC(12,8),
    output_cost_usd        NUMERIC(12,8),
    http_status_code       SMALLINT,
    error_type             TEXT,
    is_streaming           BOOLEAN,
    user_id                TEXT
);

SELECT create_hypertable('llm_requests', 'timestamp');

-- migrate:down
DROP TABLE IF EXISTS llm_requests;
