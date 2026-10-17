--
-- PostgreSQL database dump
--

\restrict u7HyRKQd4hPPBnihYIjJVX20SmsKvhWyQw8RIsNctM2mL7Dj8vq2UaNcqYJkSdh

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

--
-- Name: EventType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."EventType" AS ENUM (
    'GOAL',
    'YELLOW_CARD',
    'RED_CARD',
    'SUBSTITUTION'
);


--
-- Name: LiveStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."LiveStatus" AS ENUM (
    'LIVE',
    'FINISHED',
    'SUSPENDED'
);


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
-- Name: live_matches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.live_matches (
    match_id uuid NOT NULL,
    league_id uuid NOT NULL,
    season_id uuid NOT NULL,
    category_id uuid NOT NULL,
    owner_id uuid NOT NULL,
    home_team_id uuid NOT NULL,
    away_team_id uuid NOT NULL,
    status public."LiveStatus" DEFAULT 'LIVE'::public."LiveStatus" NOT NULL,
    started_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    finished_at timestamp(3) without time zone,
    attendance integer,
    peak_viewers integer DEFAULT 0 NOT NULL,
    notes text,
    version integer DEFAULT 0 NOT NULL
);


--
-- Name: match_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.match_events (
    id uuid NOT NULL,
    match_id uuid NOT NULL,
    type public."EventType" NOT NULL,
    team_id uuid NOT NULL,
    player_id uuid,
    player_in_id uuid,
    minute integer NOT NULL,
    value integer DEFAULT 1 NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: live_matches live_matches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.live_matches
    ADD CONSTRAINT live_matches_pkey PRIMARY KEY (match_id);


--
-- Name: match_events match_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_events
    ADD CONSTRAINT match_events_pkey PRIMARY KEY (id);


--
-- Name: live_matches_league_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX live_matches_league_id_idx ON public.live_matches USING btree (league_id);


--
-- Name: live_matches_season_id_category_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX live_matches_season_id_category_id_idx ON public.live_matches USING btree (season_id, category_id);


--
-- Name: live_matches_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX live_matches_status_idx ON public.live_matches USING btree (status);


--
-- Name: match_events_match_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX match_events_match_id_idx ON public.match_events USING btree (match_id);


--
-- Name: match_events_match_id_minute_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX match_events_match_id_minute_idx ON public.match_events USING btree (match_id, minute);


--
-- Name: match_events match_events_match_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_events
    ADD CONSTRAINT match_events_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.live_matches(match_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict u7HyRKQd4hPPBnihYIjJVX20SmsKvhWyQw8RIsNctM2mL7Dj8vq2UaNcqYJkSdh

