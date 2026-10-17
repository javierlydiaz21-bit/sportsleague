--
-- PostgreSQL database dump
--

\restrict j8UsKSNO1SNtHKYM1UWqIAnLCkwk6sVxh74ANJzzh6UniGKvpH56JxGm4PW8kVQ

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
-- Name: EligibilityStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."EligibilityStatus" AS ENUM (
    'ELIGIBLE',
    'INELIGIBLE',
    'PENDING'
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
-- Name: players; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.players (
    id uuid NOT NULL,
    team_id uuid NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    document_id text,
    birth_date date NOT NULL,
    jersey_number integer,
    "position" text,
    eligibility_status public."EligibilityStatus" DEFAULT 'PENDING'::public."EligibilityStatus" NOT NULL,
    eligibility_note text,
    registration_doc_url text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: teams; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.teams (
    id uuid NOT NULL,
    name text NOT NULL,
    league_id uuid NOT NULL,
    category_id uuid NOT NULL,
    owner_id uuid NOT NULL,
    home_venue_id uuid,
    coach_name text,
    contact_email text,
    color text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: players players_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.players
    ADD CONSTRAINT players_pkey PRIMARY KEY (id);


--
-- Name: teams teams_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_pkey PRIMARY KEY (id);


--
-- Name: players_team_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX players_team_id_idx ON public.players USING btree (team_id);


--
-- Name: players_team_id_jersey_number_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX players_team_id_jersey_number_key ON public.players USING btree (team_id, jersey_number);


--
-- Name: teams_category_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX teams_category_id_idx ON public.teams USING btree (category_id);


--
-- Name: teams_category_id_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX teams_category_id_name_key ON public.teams USING btree (category_id, name);


--
-- Name: teams_league_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX teams_league_id_idx ON public.teams USING btree (league_id);


--
-- Name: players players_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.players
    ADD CONSTRAINT players_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict j8UsKSNO1SNtHKYM1UWqIAnLCkwk6sVxh74ANJzzh6UniGKvpH56JxGm4PW8kVQ

