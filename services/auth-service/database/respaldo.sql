--
-- PostgreSQL database dump
--

\restrict C2sDjqTLZQsdg9pr07leoAr4GyxlR0Qd0x107LUrXDfp8rc2q0X6IGQtU5GaQ2s

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

ALTER TABLE IF EXISTS ONLY public.refresh_tokens DROP CONSTRAINT IF EXISTS refresh_tokens_user_id_fkey;
DROP INDEX IF EXISTS public.users_status_idx;
DROP INDEX IF EXISTS public.users_role_idx;
DROP INDEX IF EXISTS public.users_email_key;
DROP INDEX IF EXISTS public.refresh_tokens_user_id_idx;
DROP INDEX IF EXISTS public.refresh_tokens_token_hash_key;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_pkey;
ALTER TABLE IF EXISTS ONLY public.refresh_tokens DROP CONSTRAINT IF EXISTS refresh_tokens_pkey;
ALTER TABLE IF EXISTS ONLY public._prisma_migrations DROP CONSTRAINT IF EXISTS _prisma_migrations_pkey;
DROP TABLE IF EXISTS public.users;
DROP TABLE IF EXISTS public.refresh_tokens;
DROP TABLE IF EXISTS public._prisma_migrations;
DROP TYPE IF EXISTS public."UserStatus";
DROP TYPE IF EXISTS public."Role";
--
-- Name: Role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."Role" AS ENUM (
    'ADMIN',
    'ORGANIZER',
    'REFEREE',
    'SPECTATOR'
);


--
-- Name: UserStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."UserStatus" AS ENUM (
    'ACTIVE',
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
-- Name: refresh_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.refresh_tokens (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    token_hash text NOT NULL,
    csrf_hash text NOT NULL,
    expires_at timestamp(3) without time zone NOT NULL,
    revoked_at timestamp(3) without time zone,
    replaced_by uuid,
    user_agent text,
    ip text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid NOT NULL,
    email text NOT NULL,
    name text NOT NULL,
    password_hash text NOT NULL,
    role public."Role" DEFAULT 'ORGANIZER'::public."Role" NOT NULL,
    status public."UserStatus" DEFAULT 'ACTIVE'::public."UserStatus" NOT NULL,
    last_login_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
c6ecdd4a-64a9-457b-9247-6d0242f12ad0	b31f39a921b35eac37493e7fa7558ad7db17bf980d353351f366dc4547295d7e	2026-10-17 15:57:49.914677+00	20261011000000_init	\N	\N	2026-10-17 15:57:49.635533+00	1
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, email, name, password_hash, role, status, last_login_at, created_at, updated_at) FROM stdin;
086e7c86-646b-49b4-8312-10ed398c47b5	admin@sportsleague.com	Administrador	$2b$10$THJPrPvPkmqFekbMjEvcRuZgLyzKcPLpP1G3C1K3v443A18.NOGvu	ADMIN	ACTIVE	2026-10-17 15:58:03.114	2026-10-17 15:57:55.878	2026-10-17 15:58:03.115
ab7d9b35-97b6-4e00-b17e-ab915cd51696	organizador@demo.com	Laura Gómez	$2b$10$9J6LPqpXtYgVqQyyXkSy2uFYrMOXgk7wzc692vOJigv.nFi7iB3ye	ORGANIZER	ACTIVE	\N	2026-10-17 15:58:03.559	2026-10-17 15:58:03.559
0d4fc7f4-d7be-4c79-89b7-1fca4b4d4e57	arbitro@demo.com	Mario Arroyo	$2b$10$I.7p.O1M6G.Gdai80ZS00.hBCoQruFCDhhNLMCeLDFYfvhTEQ2vgO	REFEREE	ACTIVE	\N	2026-10-17 15:58:05.091	2026-10-17 15:58:05.091
cae1ef7a-182a-4de8-be5c-28ff8888cabc	aficionado@demo.com	Camilo Ruiz	$2b$10$BEOlE5y1pcOVI3Vixl.yg.D60gpwcf4lA9LYR4grewKdLzEFnF/nO	SPECTATOR	ACTIVE	\N	2026-10-17 15:58:05.307	2026-10-17 15:58:05.307
61007903-b1b8-465c-a20c-2433908a92de	organizadora@demo.com	Sofía Martínez	$2b$10$RPmIFQIXtUTTHDHfg3reB.6WcrD9PuarcYJ72zV/xwC3/4t1IAXYi	ORGANIZER	ACTIVE	\N	2026-10-17 15:58:15.942	2026-10-17 15:58:15.942
\.


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens_token_hash_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX refresh_tokens_token_hash_key ON public.refresh_tokens USING btree (token_hash);


--
-- Name: refresh_tokens_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX refresh_tokens_user_id_idx ON public.refresh_tokens USING btree (user_id);


--
-- Name: users_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);


--
-- Name: users_role_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX users_role_idx ON public.users USING btree (role);


--
-- Name: users_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX users_status_idx ON public.users USING btree (status);


--
-- Name: refresh_tokens refresh_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict C2sDjqTLZQsdg9pr07leoAr4GyxlR0Qd0x107LUrXDfp8rc2q0X6IGQtU5GaQ2s

