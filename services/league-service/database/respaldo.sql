--
-- PostgreSQL database dump
--

\restrict xMxBtLrjDQpRt84AiQ6fvvLL7U5c5msoP2qz4gg309BvIGITMSFnKP1yLJORhNb

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

ALTER TABLE IF EXISTS ONLY public.venues DROP CONSTRAINT IF EXISTS venues_league_id_fkey;
ALTER TABLE IF EXISTS ONLY public.seasons DROP CONSTRAINT IF EXISTS seasons_league_id_fkey;
ALTER TABLE IF EXISTS ONLY public.rules DROP CONSTRAINT IF EXISTS rules_category_id_fkey;
ALTER TABLE IF EXISTS ONLY public.categories DROP CONSTRAINT IF EXISTS categories_league_id_fkey;
DROP INDEX IF EXISTS public.venues_league_id_idx;
DROP INDEX IF EXISTS public.seasons_league_id_idx;
DROP INDEX IF EXISTS public.rules_category_id_key;
DROP INDEX IF EXISTS public.leagues_status_idx;
DROP INDEX IF EXISTS public.leagues_owner_id_idx;
DROP INDEX IF EXISTS public.categories_league_id_name_key;
DROP INDEX IF EXISTS public.categories_league_id_idx;
ALTER TABLE IF EXISTS ONLY public.venues DROP CONSTRAINT IF EXISTS venues_pkey;
ALTER TABLE IF EXISTS ONLY public.seasons DROP CONSTRAINT IF EXISTS seasons_pkey;
ALTER TABLE IF EXISTS ONLY public.rules DROP CONSTRAINT IF EXISTS rules_pkey;
ALTER TABLE IF EXISTS ONLY public.leagues DROP CONSTRAINT IF EXISTS leagues_pkey;
ALTER TABLE IF EXISTS ONLY public.categories DROP CONSTRAINT IF EXISTS categories_pkey;
ALTER TABLE IF EXISTS ONLY public._prisma_migrations DROP CONSTRAINT IF EXISTS _prisma_migrations_pkey;
DROP TABLE IF EXISTS public.venues;
DROP TABLE IF EXISTS public.seasons;
DROP TABLE IF EXISTS public.rules;
DROP TABLE IF EXISTS public.leagues;
DROP TABLE IF EXISTS public.categories;
DROP TABLE IF EXISTS public._prisma_migrations;
DROP TYPE IF EXISTS public."Sport";
DROP TYPE IF EXISTS public."LeagueStatus";
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
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
d1039a20-c064-4ce1-9ee3-878138107e39	f5c2c61fcabe06031f64b47ff9431659dc97197133903d239aa7e9522fd32deb	2026-10-17 15:57:51.970328+00	20261011000000_init	\N	\N	2026-10-17 15:57:51.598449+00	1
\.


--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.categories (id, league_id, name, min_age, max_age, created_at) FROM stdin;
719a94f9-95a7-43d3-ba07-2f907d87c038	e1465a8b-d5b1-418e-abc1-9f5efba20c74	Libre	16	45	2026-10-17 15:58:03.807
\.


--
-- Data for Name: leagues; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.leagues (id, name, sport, description, city, owner_id, owner_name, status, review_note, reviewed_by, reviewed_at, created_at, updated_at) FROM stdin;
e1465a8b-d5b1-418e-abc1-9f5efba20c74	Liga Amateur de Montería	FOOTBALL	Torneo de fútbol aficionado del valle del Sinú. Seis equipos, ida y vuelta, partidos los domingos.	Montería	ab7d9b35-97b6-4e00-b17e-ab915cd51696	Laura Gómez	APPROVED	Documentación de la liga verificada	086e7c86-646b-49b4-8312-10ed398c47b5	2026-10-17 15:58:03.704	2026-10-17 15:58:03.66	2026-10-17 15:58:03.706
00eaa6a9-e01b-481f-b5da-e35fce61697f	Liga Femenina de Vóley Cereté	VOLLEYBALL	Ocho clubes de vóley femenino.	Cereté	61007903-b1b8-465c-a20c-2433908a92de	Sofía Martínez	PENDING	\N	\N	\N	2026-10-17 15:58:15.966	2026-10-17 15:58:15.966
eda8ca2a-afb5-4b65-97cc-e7b7a7dd67ac	Torneo Relámpago de Básquet Sahagún	BASKETBALL	\N	Sahagún	61007903-b1b8-465c-a20c-2433908a92de	Sofía Martínez	PENDING	\N	\N	\N	2026-10-17 15:58:15.988	2026-10-17 15:58:15.988
\.


--
-- Data for Name: rules; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.rules (id, category_id, points_win, points_draw, points_loss, tiebreaker_criteria, updated_at) FROM stdin;
1393dd5f-5c73-4c2b-a6ba-ee03a730eb92	719a94f9-95a7-43d3-ba07-2f907d87c038	3	1	0	{GOAL_DIFFERENCE,GOALS_FOR,HEAD_TO_HEAD}	2026-10-17 15:58:03.807
\.


--
-- Data for Name: seasons; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.seasons (id, league_id, name, year, start_date, end_date, created_at) FROM stdin;
e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	e1465a8b-d5b1-418e-abc1-9f5efba20c74	Apertura 2026	2026	2026-08-30	2026-12-13	2026-10-17 15:58:03.755
\.


--
-- Data for Name: venues; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.venues (id, league_id, name, address, zone, available_days, open_time, close_time, created_at) FROM stdin;
2c8a9776-a71a-4b29-a20b-eda40aeece3e	e1465a8b-d5b1-418e-abc1-9f5efba20c74	Estadio Municipal de Montería	Cra. 6 # 30-15	Centro	{0,6}	08:00	18:00	2026-10-17 15:58:03.868
af04cb38-0151-4f6b-adc9-f969302ba382	e1465a8b-d5b1-418e-abc1-9f5efba20c74	Cancha La Ribera	Av. Primera, Ronda del Sinú	Norte	{6}	08:00	16:00	2026-10-17 15:58:03.898
c0898445-bca0-43f8-ad8f-960eacbd8e33	e1465a8b-d5b1-418e-abc1-9f5efba20c74	Polideportivo del Sur	Calle 41 Sur	Sur	{0,3}	14:00	20:00	2026-10-17 15:58:03.923
\.


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

\unrestrict xMxBtLrjDQpRt84AiQ6fvvLL7U5c5msoP2qz4gg309BvIGITMSFnKP1yLJORhNb

