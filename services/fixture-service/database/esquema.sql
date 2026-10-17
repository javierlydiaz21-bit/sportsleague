--
-- PostgreSQL database dump
--

\restrict GYgKFlcEKSepTp6kHGwZGSfh3AWjTkAKBSq0wpayHfxxNfWd1UUhCCm6PLFbi5c

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
-- Name: FixtureStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."FixtureStatus" AS ENUM (
    'DRAFT',
    'PUBLISHED'
);


--
-- Name: MatchStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."MatchStatus" AS ENUM (
    'SCHEDULED',
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
-- Name: fixtures; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fixtures (
    id uuid NOT NULL,
    season_id uuid NOT NULL,
    category_id uuid NOT NULL,
    league_id uuid NOT NULL,
    owner_id uuid NOT NULL,
    status public."FixtureStatus" DEFAULT 'DRAFT'::public."FixtureStatus" NOT NULL,
    double_round boolean DEFAULT false NOT NULL,
    total_rounds integer DEFAULT 0 NOT NULL,
    config jsonb NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    published_at timestamp(3) without time zone
);


--
-- Name: matches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.matches (
    id uuid NOT NULL,
    fixture_id uuid NOT NULL,
    season_id uuid NOT NULL,
    category_id uuid NOT NULL,
    league_id uuid NOT NULL,
    owner_id uuid NOT NULL,
    round integer NOT NULL,
    home_team_id uuid NOT NULL,
    away_team_id uuid NOT NULL,
    venue_id uuid,
    scheduled_at timestamp(3) without time zone NOT NULL,
    status public."MatchStatus" DEFAULT 'SCHEDULED'::public."MatchStatus" NOT NULL,
    suspension_reason text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: fixtures fixtures_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fixtures
    ADD CONSTRAINT fixtures_pkey PRIMARY KEY (id);


--
-- Name: matches matches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_pkey PRIMARY KEY (id);


--
-- Name: fixtures_season_id_category_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX fixtures_season_id_category_id_key ON public.fixtures USING btree (season_id, category_id);


--
-- Name: matches_category_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX matches_category_id_idx ON public.matches USING btree (category_id);


--
-- Name: matches_league_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX matches_league_id_idx ON public.matches USING btree (league_id);


--
-- Name: matches_season_id_scheduled_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX matches_season_id_scheduled_at_idx ON public.matches USING btree (season_id, scheduled_at);


--
-- Name: matches_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX matches_status_idx ON public.matches USING btree (status);


--
-- Name: matches matches_fixture_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_fixture_id_fkey FOREIGN KEY (fixture_id) REFERENCES public.fixtures(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict GYgKFlcEKSepTp6kHGwZGSfh3AWjTkAKBSq0wpayHfxxNfWd1UUhCCm6PLFbi5c

