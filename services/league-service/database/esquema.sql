--
-- PostgreSQL database dump
--

\restrict mjdDIrxAfgLstd3D9frIQ8GWiGMAu6Lw50aj2ARi8NpFtJCLPX4016ciSWI4GpY

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
-- Name: LeagueStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."LeagueStatus" AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED',
    'SUSPENDED'
);


--
-- Name: Sport; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."Sport" AS ENUM (
    'FOOTBALL',
    'BASKETBALL',
    'VOLLEYBALL'
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
-- Name: categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categories (
    id uuid NOT NULL,
    league_id uuid NOT NULL,
    name text NOT NULL,
    min_age integer,
    max_age integer,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: leagues; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.leagues (
    id uuid NOT NULL,
    name text NOT NULL,
    sport public."Sport" NOT NULL,
    description text,
    city text,
    owner_id uuid NOT NULL,
    owner_name text,
    status public."LeagueStatus" DEFAULT 'PENDING'::public."LeagueStatus" NOT NULL,
    review_note text,
    reviewed_by uuid,
    reviewed_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rules (
    id uuid NOT NULL,
    category_id uuid NOT NULL,
    points_win integer DEFAULT 3 NOT NULL,
    points_draw integer DEFAULT 1 NOT NULL,
    points_loss integer DEFAULT 0 NOT NULL,
    tiebreaker_criteria text[],
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: seasons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.seasons (
    id uuid NOT NULL,
    league_id uuid NOT NULL,
    name text NOT NULL,
    year integer NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: venues; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.venues (
    id uuid NOT NULL,
    league_id uuid NOT NULL,
    name text NOT NULL,
    address text,
    zone text NOT NULL,
    available_days integer[],
    open_time text NOT NULL,
    close_time text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: leagues leagues_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leagues
    ADD CONSTRAINT leagues_pkey PRIMARY KEY (id);


--
-- Name: rules rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rules
    ADD CONSTRAINT rules_pkey PRIMARY KEY (id);


--
-- Name: seasons seasons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seasons
    ADD CONSTRAINT seasons_pkey PRIMARY KEY (id);


--
-- Name: venues venues_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.venues
    ADD CONSTRAINT venues_pkey PRIMARY KEY (id);


--
-- Name: categories_league_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX categories_league_id_idx ON public.categories USING btree (league_id);


--
-- Name: categories_league_id_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX categories_league_id_name_key ON public.categories USING btree (league_id, name);


--
-- Name: leagues_owner_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX leagues_owner_id_idx ON public.leagues USING btree (owner_id);


--
-- Name: leagues_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX leagues_status_idx ON public.leagues USING btree (status);


--
-- Name: rules_category_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX rules_category_id_key ON public.rules USING btree (category_id);


--
-- Name: seasons_league_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX seasons_league_id_idx ON public.seasons USING btree (league_id);


--
-- Name: venues_league_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX venues_league_id_idx ON public.venues USING btree (league_id);


--
-- Name: categories categories_league_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_league_id_fkey FOREIGN KEY (league_id) REFERENCES public.leagues(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: rules rules_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rules
    ADD CONSTRAINT rules_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: seasons seasons_league_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seasons
    ADD CONSTRAINT seasons_league_id_fkey FOREIGN KEY (league_id) REFERENCES public.leagues(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: venues venues_league_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.venues
    ADD CONSTRAINT venues_league_id_fkey FOREIGN KEY (league_id) REFERENCES public.leagues(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict mjdDIrxAfgLstd3D9frIQ8GWiGMAu6Lw50aj2ARi8NpFtJCLPX4016ciSWI4GpY

