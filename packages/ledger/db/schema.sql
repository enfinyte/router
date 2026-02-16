\restrict dbmate

-- Dumped from database version 17.8 (Homebrew)
-- Dumped by pg_dump version 17.8 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: timescaledb; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS timescaledb WITH SCHEMA public;


--
-- Name: EXTENSION timescaledb; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION timescaledb IS 'Enables scalable inserts and complex queries for time-series data (Community Edition)';


--
-- Name: timescaledb_toolkit; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS timescaledb_toolkit WITH SCHEMA public;


--
-- Name: EXTENSION timescaledb_toolkit; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION timescaledb_toolkit IS 'Library of analytical hyperfunctions, time-series pipelining, and other SQL utilities';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: llm_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.llm_requests (
    "timestamp" timestamp with time zone NOT NULL,
    request_id uuid,
    provider text NOT NULL,
    model text NOT NULL,
    category text,
    resolution_latency_ms integer,
    ttft_ms integer,
    total_latency_ms integer,
    input_tokens integer,
    reasoning_tokens integer,
    output_tokens integer,
    input_cost_usd numeric(12,8),
    reasoning_cost_usd numeric(12,8),
    output_cost_usd numeric(12,8),
    http_status_code smallint,
    error_type text,
    is_streaming boolean,
    user_id text
);


--
-- Name: _direct_view_7; Type: VIEW; Schema: _timescaledb_internal; Owner: -
--

CREATE VIEW _timescaledb_internal._direct_view_7 AS
 SELECT public.time_bucket('00:01:00'::interval, "timestamp") AS bucket,
    user_id,
    provider,
    model,
    category,
    count(*) AS request_count,
    avg(total_latency_ms) AS avg_latency,
    public.percentile_agg((total_latency_ms)::double precision) AS latency_pct,
    avg(ttft_ms) AS avg_ttft,
    avg(resolution_latency_ms) AS avg_resolution_latency,
    sum(input_tokens) AS total_input_tokens,
    sum(reasoning_tokens) AS total_reasoning_tokens,
    sum(output_tokens) AS total_output_tokens,
    sum(((input_cost_usd + reasoning_cost_usd) + output_cost_usd)) AS total_cost,
    count(*) FILTER (WHERE (http_status_code >= 400)) AS error_count,
    count(*) FILTER (WHERE (http_status_code = 429)) AS rate_limit_count
   FROM public.llm_requests
  GROUP BY (public.time_bucket('00:01:00'::interval, "timestamp")), user_id, provider, model, category;


--
-- Name: _materialized_hypertable_7; Type: TABLE; Schema: _timescaledb_internal; Owner: -
--

CREATE TABLE _timescaledb_internal._materialized_hypertable_7 (
    bucket timestamp with time zone NOT NULL,
    user_id text,
    provider text,
    model text,
    category text,
    request_count bigint,
    avg_latency numeric,
    latency_pct public.uddsketch,
    avg_ttft numeric,
    avg_resolution_latency numeric,
    total_input_tokens bigint,
    total_reasoning_tokens bigint,
    total_output_tokens bigint,
    total_cost numeric,
    error_count bigint,
    rate_limit_count bigint
);


--
-- Name: llm_metrics_1m; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.llm_metrics_1m AS
 SELECT bucket,
    user_id,
    provider,
    model,
    category,
    request_count,
    avg_latency,
    latency_pct,
    avg_ttft,
    avg_resolution_latency,
    total_input_tokens,
    total_reasoning_tokens,
    total_output_tokens,
    total_cost,
    error_count,
    rate_limit_count
   FROM _timescaledb_internal._materialized_hypertable_7;


--
-- Name: _direct_view_8; Type: VIEW; Schema: _timescaledb_internal; Owner: -
--

CREATE VIEW _timescaledb_internal._direct_view_8 AS
 SELECT public.time_bucket('01:00:00'::interval, bucket) AS bucket,
    user_id,
    provider,
    model,
    category,
    sum(request_count) AS request_count,
    sum(total_input_tokens) AS total_input_tokens,
    sum(total_reasoning_tokens) AS total_reasoning_tokens,
    sum(total_output_tokens) AS total_output_tokens,
    sum(total_cost) AS total_cost,
    sum(error_count) AS error_count
   FROM public.llm_metrics_1m
  GROUP BY (public.time_bucket('01:00:00'::interval, bucket)), user_id, provider, model, category;


--
-- Name: _materialized_hypertable_8; Type: TABLE; Schema: _timescaledb_internal; Owner: -
--

CREATE TABLE _timescaledb_internal._materialized_hypertable_8 (
    bucket timestamp with time zone NOT NULL,
    user_id text,
    provider text,
    model text,
    category text,
    request_count numeric,
    total_input_tokens numeric,
    total_reasoning_tokens numeric,
    total_output_tokens numeric,
    total_cost numeric,
    error_count numeric
);


--
-- Name: _partial_view_7; Type: VIEW; Schema: _timescaledb_internal; Owner: -
--

CREATE VIEW _timescaledb_internal._partial_view_7 AS
 SELECT public.time_bucket('00:01:00'::interval, "timestamp") AS bucket,
    user_id,
    provider,
    model,
    category,
    count(*) AS request_count,
    avg(total_latency_ms) AS avg_latency,
    public.percentile_agg((total_latency_ms)::double precision) AS latency_pct,
    avg(ttft_ms) AS avg_ttft,
    avg(resolution_latency_ms) AS avg_resolution_latency,
    sum(input_tokens) AS total_input_tokens,
    sum(reasoning_tokens) AS total_reasoning_tokens,
    sum(output_tokens) AS total_output_tokens,
    sum(((input_cost_usd + reasoning_cost_usd) + output_cost_usd)) AS total_cost,
    count(*) FILTER (WHERE (http_status_code >= 400)) AS error_count,
    count(*) FILTER (WHERE (http_status_code = 429)) AS rate_limit_count
   FROM public.llm_requests
  GROUP BY (public.time_bucket('00:01:00'::interval, "timestamp")), user_id, provider, model, category;


--
-- Name: _partial_view_8; Type: VIEW; Schema: _timescaledb_internal; Owner: -
--

CREATE VIEW _timescaledb_internal._partial_view_8 AS
 SELECT public.time_bucket('01:00:00'::interval, bucket) AS bucket,
    user_id,
    provider,
    model,
    category,
    sum(request_count) AS request_count,
    sum(total_input_tokens) AS total_input_tokens,
    sum(total_reasoning_tokens) AS total_reasoning_tokens,
    sum(total_output_tokens) AS total_output_tokens,
    sum(total_cost) AS total_cost,
    sum(error_count) AS error_count
   FROM public.llm_metrics_1m
  GROUP BY (public.time_bucket('01:00:00'::interval, bucket)), user_id, provider, model, category;


--
-- Name: llm_metrics_1h; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.llm_metrics_1h AS
 SELECT bucket,
    user_id,
    provider,
    model,
    category,
    request_count,
    total_input_tokens,
    total_reasoning_tokens,
    total_output_tokens,
    total_cost,
    error_count
   FROM _timescaledb_internal._materialized_hypertable_8;


--
-- Name: schema_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schema_migrations (
    version character varying NOT NULL
);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: _materialized_hypertable_7_bucket_idx; Type: INDEX; Schema: _timescaledb_internal; Owner: -
--

CREATE INDEX _materialized_hypertable_7_bucket_idx ON _timescaledb_internal._materialized_hypertable_7 USING btree (bucket DESC);


--
-- Name: _materialized_hypertable_7_category_bucket_idx; Type: INDEX; Schema: _timescaledb_internal; Owner: -
--

CREATE INDEX _materialized_hypertable_7_category_bucket_idx ON _timescaledb_internal._materialized_hypertable_7 USING btree (category, bucket DESC);


--
-- Name: _materialized_hypertable_7_model_bucket_idx; Type: INDEX; Schema: _timescaledb_internal; Owner: -
--

CREATE INDEX _materialized_hypertable_7_model_bucket_idx ON _timescaledb_internal._materialized_hypertable_7 USING btree (model, bucket DESC);


--
-- Name: _materialized_hypertable_7_provider_bucket_idx; Type: INDEX; Schema: _timescaledb_internal; Owner: -
--

CREATE INDEX _materialized_hypertable_7_provider_bucket_idx ON _timescaledb_internal._materialized_hypertable_7 USING btree (provider, bucket DESC);


--
-- Name: _materialized_hypertable_7_user_id_bucket_idx; Type: INDEX; Schema: _timescaledb_internal; Owner: -
--

CREATE INDEX _materialized_hypertable_7_user_id_bucket_idx ON _timescaledb_internal._materialized_hypertable_7 USING btree (user_id, bucket DESC);


--
-- Name: _materialized_hypertable_8_bucket_idx; Type: INDEX; Schema: _timescaledb_internal; Owner: -
--

CREATE INDEX _materialized_hypertable_8_bucket_idx ON _timescaledb_internal._materialized_hypertable_8 USING btree (bucket DESC);


--
-- Name: _materialized_hypertable_8_category_bucket_idx; Type: INDEX; Schema: _timescaledb_internal; Owner: -
--

CREATE INDEX _materialized_hypertable_8_category_bucket_idx ON _timescaledb_internal._materialized_hypertable_8 USING btree (category, bucket DESC);


--
-- Name: _materialized_hypertable_8_model_bucket_idx; Type: INDEX; Schema: _timescaledb_internal; Owner: -
--

CREATE INDEX _materialized_hypertable_8_model_bucket_idx ON _timescaledb_internal._materialized_hypertable_8 USING btree (model, bucket DESC);


--
-- Name: _materialized_hypertable_8_provider_bucket_idx; Type: INDEX; Schema: _timescaledb_internal; Owner: -
--

CREATE INDEX _materialized_hypertable_8_provider_bucket_idx ON _timescaledb_internal._materialized_hypertable_8 USING btree (provider, bucket DESC);


--
-- Name: _materialized_hypertable_8_user_id_bucket_idx; Type: INDEX; Schema: _timescaledb_internal; Owner: -
--

CREATE INDEX _materialized_hypertable_8_user_id_bucket_idx ON _timescaledb_internal._materialized_hypertable_8 USING btree (user_id, bucket DESC);


--
-- Name: idx_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_category ON public.llm_requests USING btree (category, "timestamp" DESC);


--
-- Name: idx_provider_model; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_provider_model ON public.llm_requests USING btree (provider, model, "timestamp" DESC);


--
-- Name: idx_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_status ON public.llm_requests USING btree (http_status_code, "timestamp" DESC);


--
-- Name: idx_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_id ON public.llm_requests USING btree (user_id, "timestamp" DESC);


--
-- Name: llm_requests_timestamp_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX llm_requests_timestamp_idx ON public.llm_requests USING btree ("timestamp" DESC);


--
-- PostgreSQL database dump complete
--

\unrestrict dbmate


--
-- Dbmate schema migrations
--

INSERT INTO public.schema_migrations (version) VALUES
    ('002'),
    ('003'),
    ('004'),
    ('005'),
    ('006'),
    ('007');
