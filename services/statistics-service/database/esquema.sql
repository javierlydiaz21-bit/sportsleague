--
-- PostgreSQL database dump
--

\restrict bKPqydAA767r3OGjme8g4ecEHvt5rVH02Rm6CyH8cMtx0hBxDrcbXsbBZwQKyj8

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
-- Name: disciplinary_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.disciplinary_records (
    id uuid NOT NULL,
    season_id uuid NOT NULL,
    category_id uuid NOT NULL,
    player_id uuid NOT NULL,
    team_id uuid NOT NULL,
    yellow_cards integer NOT NULL,
    red_cards integer NOT NULL
);


--
-- Name: match_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.match_results (
    match_id uuid NOT NULL,
    league_id uuid NOT NULL,
    season_id uuid NOT NULL,
    category_id uuid NOT NULL,
    owner_id uuid NOT NULL,
    home_team_id uuid NOT NULL,
    away_team_id uuid NOT NULL,
    home_score integer NOT NULL,
    away_score integer NOT NULL,
    version integer NOT NULL,
    completed_at timestamp(3) without time zone NOT NULL,
    events jsonb NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: standings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.standings (
    id uuid NOT NULL,
    season_id uuid NOT NULL,
    category_id uuid NOT NULL,
    team_id uuid NOT NULL,
    "position" integer NOT NULL,
    played integer NOT NULL,
    wins integer NOT NULL,
    draws integer NOT NULL,
    losses integer NOT NULL,
    goals_for integer NOT NULL,
    goals_against integer NOT NULL,
    goal_difference integer NOT NULL,
    points integer NOT NULL,
    form text[],
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: top_scorers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.top_scorers (
    id uuid NOT NULL,
    season_id uuid NOT NULL,
    category_id uuid NOT NULL,
    player_id uuid NOT NULL,
    team_id uuid NOT NULL,
    goals integer NOT NULL
);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: disciplinary_records disciplinary_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.disciplinary_records
    ADD CONSTRAINT disciplinary_records_pkey PRIMARY KEY (id);


--
-- Name: match_results match_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_results
    ADD CONSTRAINT match_results_pkey PRIMARY KEY (match_id);


--
-- Name: standings standings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.standings
    ADD CONSTRAINT standings_pkey PRIMARY KEY (id);


--
-- Name: top_scorers top_scorers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.top_scorers
    ADD CONSTRAINT top_scorers_pkey PRIMARY KEY (id);


--
-- Name: disciplinary_records_player_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX disciplinary_records_player_id_idx ON public.disciplinary_records USING btree (player_id);


--
-- Name: disciplinary_records_season_id_category_id_player_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX disciplinary_records_season_id_category_id_player_id_key ON public.disciplinary_records USING btree (season_id, category_id, player_id);


--
-- Name: match_results_season_id_category_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX match_results_season_id_category_id_idx ON public.match_results USING btree (season_id, category_id);


--
-- Name: standings_season_id_category_id_team_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX standings_season_id_category_id_team_id_key ON public.standings USING btree (season_id, category_id, team_id);


--
-- Name: standings_season_id_team_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX standings_season_id_team_id_idx ON public.standings USING btree (season_id, team_id);


--
-- Name: top_scorers_season_id_category_id_player_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX top_scorers_season_id_category_id_player_id_key ON public.top_scorers USING btree (season_id, category_id, player_id);


--
-- Name: top_scorers_season_id_goals_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX top_scorers_season_id_goals_idx ON public.top_scorers USING btree (season_id, goals);


--
-- PostgreSQL database dump complete
--

\unrestrict bKPqydAA767r3OGjme8g4ecEHvt5rVH02Rm6CyH8cMtx0hBxDrcbXsbBZwQKyj8

