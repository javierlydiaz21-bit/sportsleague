--
-- PostgreSQL database dump
--

\restrict dtZxqXMQToyS9FQzgcsRfKneMK6F5rMXD2g5WNbihezhiIdsij3oKKGbAcSNLg9

-- Dumped from database version 16.15
-- Dumped by pg_dump version 16.15

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


--
-- Name: attendance_estimates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.attendance_estimates (
    id uuid NOT NULL,
    match_id uuid NOT NULL,
    league_id uuid NOT NULL,
    season_id uuid NOT NULL,
    category_id uuid NOT NULL,
    owner_id uuid NOT NULL,
    home_team_id uuid NOT NULL,
    away_team_id uuid NOT NULL,
    scheduled_at timestamp(3) without time zone NOT NULL,
    estimated_attendance integer NOT NULL,
    source text NOT NULL,
    computed_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: etl_runs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.etl_runs (
    id uuid NOT NULL,
    trigger text NOT NULL,
    status text NOT NULL,
    started_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    finished_at timestamp(3) without time zone,
    duration_ms integer,
    rows_processed integer DEFAULT 0 NOT NULL,
    error text
);


--
-- Name: league_kpis; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.league_kpis (
    league_id uuid NOT NULL,
    owner_id uuid NOT NULL,
    total_matches integer NOT NULL,
    scheduled integer NOT NULL,
    live integer NOT NULL,
    finished integer NOT NULL,
    suspended integer NOT NULL,
    total_goals integer NOT NULL,
    total_cards integer NOT NULL,
    avg_goals_per_match double precision NOT NULL,
    avg_attendance double precision NOT NULL,
    computed_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: suspended_matches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.suspended_matches (
    id uuid NOT NULL,
    match_id uuid NOT NULL,
    league_id uuid NOT NULL,
    season_id uuid NOT NULL,
    category_id uuid NOT NULL,
    owner_id uuid NOT NULL,
    home_team_id uuid NOT NULL,
    away_team_id uuid NOT NULL,
    reason text,
    scheduled_at timestamp(3) without time zone NOT NULL,
    computed_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: team_performance_trend; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.team_performance_trend (
    id uuid NOT NULL,
    team_id uuid NOT NULL,
    season_id uuid NOT NULL,
    category_id uuid NOT NULL,
    league_id uuid NOT NULL,
    match_index integer NOT NULL,
    match_id uuid NOT NULL,
    result text NOT NULL,
    points_cumulative integer NOT NULL,
    goal_difference_cumulative integer NOT NULL,
    played_at timestamp(3) without time zone NOT NULL
);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: attendance_estimates attendance_estimates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_estimates
    ADD CONSTRAINT attendance_estimates_pkey PRIMARY KEY (id);


--
-- Name: etl_runs etl_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.etl_runs
    ADD CONSTRAINT etl_runs_pkey PRIMARY KEY (id);


--
-- Name: league_kpis league_kpis_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.league_kpis
    ADD CONSTRAINT league_kpis_pkey PRIMARY KEY (league_id);


--
-- Name: suspended_matches suspended_matches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suspended_matches
    ADD CONSTRAINT suspended_matches_pkey PRIMARY KEY (id);


--
-- Name: team_performance_trend team_performance_trend_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_performance_trend
    ADD CONSTRAINT team_performance_trend_pkey PRIMARY KEY (id);


--
-- Name: attendance_estimates_league_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX attendance_estimates_league_id_idx ON public.attendance_estimates USING btree (league_id);


--
-- Name: attendance_estimates_match_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX attendance_estimates_match_id_key ON public.attendance_estimates USING btree (match_id);


--
-- Name: etl_runs_started_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX etl_runs_started_at_idx ON public.etl_runs USING btree (started_at);


--
-- Name: suspended_matches_league_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX suspended_matches_league_id_idx ON public.suspended_matches USING btree (league_id);


--
-- Name: suspended_matches_match_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX suspended_matches_match_id_key ON public.suspended_matches USING btree (match_id);


--
-- Name: team_performance_trend_team_id_season_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX team_performance_trend_team_id_season_id_idx ON public.team_performance_trend USING btree (team_id, season_id);


--
-- Name: team_performance_trend_team_id_season_id_match_index_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX team_performance_trend_team_id_season_id_match_index_key ON public.team_performance_trend USING btree (team_id, season_id, match_index);


--
-- PostgreSQL database dump complete
--

\unrestrict dtZxqXMQToyS9FQzgcsRfKneMK6F5rMXD2g5WNbihezhiIdsij3oKKGbAcSNLg9

