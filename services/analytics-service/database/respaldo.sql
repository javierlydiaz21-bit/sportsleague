--
-- PostgreSQL database dump
--

\restrict gwGgEqw71UbYoRue6SJCI47OMK9VCvk239WrNdH0jflT7ft0bLD2wI8ZTFkaRjc

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

DROP INDEX IF EXISTS public.team_performance_trend_team_id_season_id_match_index_key;
DROP INDEX IF EXISTS public.team_performance_trend_team_id_season_id_idx;
DROP INDEX IF EXISTS public.suspended_matches_match_id_key;
DROP INDEX IF EXISTS public.suspended_matches_league_id_idx;
DROP INDEX IF EXISTS public.etl_runs_started_at_idx;
DROP INDEX IF EXISTS public.attendance_estimates_match_id_key;
DROP INDEX IF EXISTS public.attendance_estimates_league_id_idx;
ALTER TABLE IF EXISTS ONLY public.team_performance_trend DROP CONSTRAINT IF EXISTS team_performance_trend_pkey;
ALTER TABLE IF EXISTS ONLY public.suspended_matches DROP CONSTRAINT IF EXISTS suspended_matches_pkey;
ALTER TABLE IF EXISTS ONLY public.league_kpis DROP CONSTRAINT IF EXISTS league_kpis_pkey;
ALTER TABLE IF EXISTS ONLY public.etl_runs DROP CONSTRAINT IF EXISTS etl_runs_pkey;
ALTER TABLE IF EXISTS ONLY public.attendance_estimates DROP CONSTRAINT IF EXISTS attendance_estimates_pkey;
ALTER TABLE IF EXISTS ONLY public._prisma_migrations DROP CONSTRAINT IF EXISTS _prisma_migrations_pkey;
DROP TABLE IF EXISTS public.team_performance_trend;
DROP TABLE IF EXISTS public.suspended_matches;
DROP TABLE IF EXISTS public.league_kpis;
DROP TABLE IF EXISTS public.etl_runs;
DROP TABLE IF EXISTS public.attendance_estimates;
DROP TABLE IF EXISTS public._prisma_migrations;
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
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
afe1d0cb-723e-4dbb-b159-0e0ef62ba6e1	7b22da1b6bbfa9fae3f801e2b7a593b965399e2696334decb6b25eb12a99ed5b	2026-10-17 15:57:54.48119+00	20261011000000_init	\N	\N	2026-10-17 15:57:54.301488+00	1
\.


--
-- Data for Name: attendance_estimates; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.attendance_estimates (id, match_id, league_id, season_id, category_id, owner_id, home_team_id, away_team_id, scheduled_at, estimated_attendance, source, computed_at) FROM stdin;
6d2aa030-e96c-4075-814e-fc9b7376b516	5a68f769-52fd-43d5-a5f6-db37fe8cb545	e1465a8b-d5b1-418e-abc1-9f5efba20c74	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	ab7d9b35-97b6-4e00-b17e-ab915cd51696	b8ff9a76-bd82-424a-90d3-4cecfbf65b5f	4bde52dc-874c-4828-a3e8-eb1f6a7585b6	2026-08-30 13:00:00	429	REPORTED	2026-10-17 15:59:57.742
d634a216-5db6-4cde-977c-3d2c29291982	68f2e9ed-483c-41e8-8dbb-50a0b76d7082	e1465a8b-d5b1-418e-abc1-9f5efba20c74	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	ab7d9b35-97b6-4e00-b17e-ab915cd51696	32c34014-0bd9-4102-ad3a-5f84bc59a5a5	b9547f9d-bcf3-416d-be8e-49747b939a79	2026-08-30 19:00:00	407	REPORTED	2026-10-17 15:59:57.742
af810086-2777-4f48-9ef8-d5922ab6e310	4f6fb652-5483-48de-9f65-fab75b5a1abc	e1465a8b-d5b1-418e-abc1-9f5efba20c74	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	ab7d9b35-97b6-4e00-b17e-ab915cd51696	7d428867-6b12-452d-861e-a519d70dedd0	ab0337ae-4666-4966-8dcf-6ee5550f3e22	2026-08-30 21:00:00	369	REPORTED	2026-10-17 15:59:57.742
6281b2c3-c24c-4b87-999e-39de9969db69	0d759168-6570-4058-9717-ae3c3ec90e42	e1465a8b-d5b1-418e-abc1-9f5efba20c74	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	ab7d9b35-97b6-4e00-b17e-ab915cd51696	32c34014-0bd9-4102-ad3a-5f84bc59a5a5	b8ff9a76-bd82-424a-90d3-4cecfbf65b5f	2026-09-06 13:00:00	259	REPORTED	2026-10-17 15:59:57.742
6f66cedc-a0cd-44dc-ba8a-f6407f1894ac	a39c5742-4fdf-4c2a-894a-c5258fdaebc3	e1465a8b-d5b1-418e-abc1-9f5efba20c74	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	ab7d9b35-97b6-4e00-b17e-ab915cd51696	ab0337ae-4666-4966-8dcf-6ee5550f3e22	b9547f9d-bcf3-416d-be8e-49747b939a79	2026-09-06 15:00:00	231	REPORTED	2026-10-17 15:59:57.742
ebb5ae21-fdec-40a6-bec2-be2b57bee8c4	7f6961be-530a-4365-8f72-70c525432a9c	e1465a8b-d5b1-418e-abc1-9f5efba20c74	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	ab7d9b35-97b6-4e00-b17e-ab915cd51696	7d428867-6b12-452d-861e-a519d70dedd0	4bde52dc-874c-4828-a3e8-eb1f6a7585b6	2026-09-06 19:00:00	223	REPORTED	2026-10-17 15:59:57.742
9229a854-1e33-42d3-9a6c-ebc04d162cb7	946b0e8d-5750-40d9-82c9-28963daa90c1	e1465a8b-d5b1-418e-abc1-9f5efba20c74	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	ab7d9b35-97b6-4e00-b17e-ab915cd51696	b8ff9a76-bd82-424a-90d3-4cecfbf65b5f	7d428867-6b12-452d-861e-a519d70dedd0	2026-09-13 13:00:00	290	REPORTED	2026-10-17 15:59:57.742
99288010-d993-45cd-875c-f4c00f76fdc4	58dd0ad4-afde-46cf-b2dd-b658a64cea8a	e1465a8b-d5b1-418e-abc1-9f5efba20c74	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	ab7d9b35-97b6-4e00-b17e-ab915cd51696	b9547f9d-bcf3-416d-be8e-49747b939a79	4bde52dc-874c-4828-a3e8-eb1f6a7585b6	2026-09-13 15:00:00	111	REPORTED	2026-10-17 15:59:57.742
b8b95304-c11f-4184-b811-198a20be1b7b	aa369254-a42b-4b36-a4cd-fd3624dca403	e1465a8b-d5b1-418e-abc1-9f5efba20c74	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	ab7d9b35-97b6-4e00-b17e-ab915cd51696	ab0337ae-4666-4966-8dcf-6ee5550f3e22	32c34014-0bd9-4102-ad3a-5f84bc59a5a5	2026-09-13 19:00:00	173	REPORTED	2026-10-17 15:59:57.742
c03d9348-1a90-4fae-9c60-be6bde0d3de3	4e5ba4a4-455a-45d1-aadb-ae47d00660be	e1465a8b-d5b1-418e-abc1-9f5efba20c74	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	ab7d9b35-97b6-4e00-b17e-ab915cd51696	b9547f9d-bcf3-416d-be8e-49747b939a79	7d428867-6b12-452d-861e-a519d70dedd0	2026-09-20 13:00:00	323	REPORTED	2026-10-17 15:59:57.742
029e34a8-8ec7-4e71-84dc-5f4fb219efc4	17d59921-c355-40cb-95b6-afd38c212124	e1465a8b-d5b1-418e-abc1-9f5efba20c74	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	ab7d9b35-97b6-4e00-b17e-ab915cd51696	ab0337ae-4666-4966-8dcf-6ee5550f3e22	b8ff9a76-bd82-424a-90d3-4cecfbf65b5f	2026-09-20 19:00:00	441	REPORTED	2026-10-17 15:59:57.742
d32505f3-8287-457d-a96a-e78058b8b8e6	85e59089-be9a-4c45-9600-85a287009a56	e1465a8b-d5b1-418e-abc1-9f5efba20c74	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	ab7d9b35-97b6-4e00-b17e-ab915cd51696	4bde52dc-874c-4828-a3e8-eb1f6a7585b6	32c34014-0bd9-4102-ad3a-5f84bc59a5a5	2026-09-20 21:00:00	315	REPORTED	2026-10-17 15:59:57.742
30acc13c-5ab7-4b56-bd54-2ae130ff8801	164d663d-0e19-447b-9ac7-66262a7cdc5a	e1465a8b-d5b1-418e-abc1-9f5efba20c74	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	ab7d9b35-97b6-4e00-b17e-ab915cd51696	b8ff9a76-bd82-424a-90d3-4cecfbf65b5f	b9547f9d-bcf3-416d-be8e-49747b939a79	2026-09-27 13:00:00	216	REPORTED	2026-10-17 15:59:57.742
eb40a411-3611-4b6a-8b5b-25c3c51d476f	5949d616-faf0-4dc8-a3d0-22f773454225	e1465a8b-d5b1-418e-abc1-9f5efba20c74	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	ab7d9b35-97b6-4e00-b17e-ab915cd51696	32c34014-0bd9-4102-ad3a-5f84bc59a5a5	7d428867-6b12-452d-861e-a519d70dedd0	2026-09-27 15:00:00	354	REPORTED	2026-10-17 15:59:57.742
2fe0c843-7ebf-4fd6-bf63-7d313075cc9c	dcae3a01-e4b1-4b24-a590-52c23e701038	e1465a8b-d5b1-418e-abc1-9f5efba20c74	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	ab7d9b35-97b6-4e00-b17e-ab915cd51696	4bde52dc-874c-4828-a3e8-eb1f6a7585b6	ab0337ae-4666-4966-8dcf-6ee5550f3e22	2026-09-27 19:00:00	265	REPORTED	2026-10-17 15:59:57.742
14457717-b8cb-4077-b4d5-bfd99986df0c	9a8499dd-8f31-4e13-80f8-a835ff60c70f	e1465a8b-d5b1-418e-abc1-9f5efba20c74	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	ab7d9b35-97b6-4e00-b17e-ab915cd51696	b9547f9d-bcf3-416d-be8e-49747b939a79	32c34014-0bd9-4102-ad3a-5f84bc59a5a5	2026-10-04 13:00:00	113	REPORTED	2026-10-17 15:59:57.742
17d25c9e-c1aa-4a93-9312-f005db99dc8a	c5cbce55-1e3b-4300-b1b5-1255903f5a20	e1465a8b-d5b1-418e-abc1-9f5efba20c74	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	ab7d9b35-97b6-4e00-b17e-ab915cd51696	4bde52dc-874c-4828-a3e8-eb1f6a7585b6	b8ff9a76-bd82-424a-90d3-4cecfbf65b5f	2026-10-04 19:00:00	341	REPORTED	2026-10-17 15:59:57.742
88970efc-8a72-44f3-b11d-708732b6ddae	904e9388-81db-443f-87f6-3e3a39ea27f9	e1465a8b-d5b1-418e-abc1-9f5efba20c74	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	ab7d9b35-97b6-4e00-b17e-ab915cd51696	ab0337ae-4666-4966-8dcf-6ee5550f3e22	7d428867-6b12-452d-861e-a519d70dedd0	2026-10-04 21:00:00	218	REPORTED	2026-10-17 15:59:57.742
b9c7134f-f72e-4632-8653-a57894a0d605	f3caf4be-b9a0-4011-bd67-60aa8d81bcd5	e1465a8b-d5b1-418e-abc1-9f5efba20c74	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	ab7d9b35-97b6-4e00-b17e-ab915cd51696	b8ff9a76-bd82-424a-90d3-4cecfbf65b5f	32c34014-0bd9-4102-ad3a-5f84bc59a5a5	2026-10-11 13:00:00	389	REPORTED	2026-10-17 15:59:57.742
822c86df-4804-46a3-b168-78dacdae34c3	ff95bca3-f823-4026-8c6f-3c94990de590	e1465a8b-d5b1-418e-abc1-9f5efba20c74	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	ab7d9b35-97b6-4e00-b17e-ab915cd51696	b9547f9d-bcf3-416d-be8e-49747b939a79	ab0337ae-4666-4966-8dcf-6ee5550f3e22	2026-10-11 15:00:00	242	REPORTED	2026-10-17 15:59:57.742
\.


--
-- Data for Name: etl_runs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.etl_runs (id, trigger, status, started_at, finished_at, duration_ms, rows_processed, error) FROM stdin;
25f1cfb0-6fb4-4be8-a4b4-809eb3103e2f	startup	SUCCESS	2026-10-17 15:58:17.704	2026-10-17 15:58:17.843	125	206	\N
1f1e45a7-c879-487f-bd6c-9b1b000cd611	manual	SUCCESS	2026-10-17 15:58:19.153	2026-10-17 15:58:19.187	31	206	\N
ac68e61f-f74c-484f-93a5-824e38b54ee0	schedule	SUCCESS	2026-10-17 15:59:57.676	2026-10-17 15:59:57.763	83	206	\N
\.


--
-- Data for Name: league_kpis; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.league_kpis (league_id, owner_id, total_matches, scheduled, live, finished, suspended, total_goals, total_cards, avg_goals_per_match, avg_attendance, computed_at) FROM stdin;
e1465a8b-d5b1-418e-abc1-9f5efba20c74	ab7d9b35-97b6-4e00-b17e-ab915cd51696	30	8	1	20	1	57	36	2.85	285.5	2026-10-17 15:59:57.742
\.


--
-- Data for Name: suspended_matches; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.suspended_matches (id, match_id, league_id, season_id, category_id, owner_id, home_team_id, away_team_id, reason, scheduled_at, computed_at) FROM stdin;
485312cf-6056-4ddd-bbe4-a53b7211729a	c3ca84b4-19ca-4088-a77a-e592fcd477bd	e1465a8b-d5b1-418e-abc1-9f5efba20c74	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	ab7d9b35-97b6-4e00-b17e-ab915cd51696	32c34014-0bd9-4102-ad3a-5f84bc59a5a5	ab0337ae-4666-4966-8dcf-6ee5550f3e22	Cancha en mantenimiento por lluvias	2026-10-18 13:00:00	2026-10-17 15:59:57.742
\.


--
-- Data for Name: team_performance_trend; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.team_performance_trend (id, team_id, season_id, category_id, league_id, match_index, match_id, result, points_cumulative, goal_difference_cumulative, played_at) FROM stdin;
ef536a39-7e2d-4906-9cab-fa971e01fa9d	b8ff9a76-bd82-424a-90d3-4cecfbf65b5f	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	e1465a8b-d5b1-418e-abc1-9f5efba20c74	1	5a68f769-52fd-43d5-a5f6-db37fe8cb545	E	1	0	2026-10-17 15:58:10.008
af908a71-cc08-42dc-a01c-e99df9e375ba	4bde52dc-874c-4828-a3e8-eb1f6a7585b6	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	e1465a8b-d5b1-418e-abc1-9f5efba20c74	1	5a68f769-52fd-43d5-a5f6-db37fe8cb545	E	1	0	2026-10-17 15:58:10.008
9c018e96-574a-44d6-9d71-c19685c47dd3	32c34014-0bd9-4102-ad3a-5f84bc59a5a5	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	e1465a8b-d5b1-418e-abc1-9f5efba20c74	1	68f2e9ed-483c-41e8-8dbb-50a0b76d7082	G	3	3	2026-10-17 15:58:10.366
e7951b06-1301-42bd-b660-891233084f38	b9547f9d-bcf3-416d-be8e-49747b939a79	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	e1465a8b-d5b1-418e-abc1-9f5efba20c74	1	68f2e9ed-483c-41e8-8dbb-50a0b76d7082	P	0	-3	2026-10-17 15:58:10.366
e06a6484-2f79-4a22-865a-1cb2b914afb5	7d428867-6b12-452d-861e-a519d70dedd0	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	e1465a8b-d5b1-418e-abc1-9f5efba20c74	1	4f6fb652-5483-48de-9f65-fab75b5a1abc	G	3	1	2026-10-17 15:58:10.624
e2b044df-5833-4eb2-be8f-ae496ff6b2de	ab0337ae-4666-4966-8dcf-6ee5550f3e22	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	e1465a8b-d5b1-418e-abc1-9f5efba20c74	1	4f6fb652-5483-48de-9f65-fab75b5a1abc	P	0	-1	2026-10-17 15:58:10.624
758b0788-9b98-4595-ad53-c471b5e41547	32c34014-0bd9-4102-ad3a-5f84bc59a5a5	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	e1465a8b-d5b1-418e-abc1-9f5efba20c74	2	0d759168-6570-4058-9717-ae3c3ec90e42	P	3	0	2026-10-17 15:58:10.938
b7c21f10-475a-42ad-a3b1-9641fc095d6e	b8ff9a76-bd82-424a-90d3-4cecfbf65b5f	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	e1465a8b-d5b1-418e-abc1-9f5efba20c74	2	0d759168-6570-4058-9717-ae3c3ec90e42	G	4	3	2026-10-17 15:58:10.938
d4c45054-1a1c-43fc-badc-fd681d804845	ab0337ae-4666-4966-8dcf-6ee5550f3e22	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	e1465a8b-d5b1-418e-abc1-9f5efba20c74	2	a39c5742-4fdf-4c2a-894a-c5258fdaebc3	P	0	-4	2026-10-17 15:58:11.267
87508053-17fc-41fc-ba9b-b8e8b064fb0d	b9547f9d-bcf3-416d-be8e-49747b939a79	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	e1465a8b-d5b1-418e-abc1-9f5efba20c74	2	a39c5742-4fdf-4c2a-894a-c5258fdaebc3	G	3	0	2026-10-17 15:58:11.267
5e9b037a-8e91-4e0b-976a-5b430adcb3c9	7d428867-6b12-452d-861e-a519d70dedd0	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	e1465a8b-d5b1-418e-abc1-9f5efba20c74	2	7f6961be-530a-4365-8f72-70c525432a9c	G	6	3	2026-10-17 15:58:11.562
fd203146-c264-451e-a600-1dd68397cab5	4bde52dc-874c-4828-a3e8-eb1f6a7585b6	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	e1465a8b-d5b1-418e-abc1-9f5efba20c74	2	7f6961be-530a-4365-8f72-70c525432a9c	P	1	-2	2026-10-17 15:58:11.562
1d553069-0699-4139-a055-348f7fd87d86	b8ff9a76-bd82-424a-90d3-4cecfbf65b5f	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	e1465a8b-d5b1-418e-abc1-9f5efba20c74	3	946b0e8d-5750-40d9-82c9-28963daa90c1	P	4	2	2026-10-17 15:58:11.889
db423542-d85a-431b-888b-1a1759118ce8	7d428867-6b12-452d-861e-a519d70dedd0	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	e1465a8b-d5b1-418e-abc1-9f5efba20c74	3	946b0e8d-5750-40d9-82c9-28963daa90c1	G	9	4	2026-10-17 15:58:11.889
9b711667-29b2-4326-aa26-f6b5a981c8e1	b9547f9d-bcf3-416d-be8e-49747b939a79	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	e1465a8b-d5b1-418e-abc1-9f5efba20c74	3	58dd0ad4-afde-46cf-b2dd-b658a64cea8a	G	6	1	2026-10-17 15:58:12.079
330e1c33-3cc1-4de6-aea1-aa87f69767c2	4bde52dc-874c-4828-a3e8-eb1f6a7585b6	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	e1465a8b-d5b1-418e-abc1-9f5efba20c74	3	58dd0ad4-afde-46cf-b2dd-b658a64cea8a	P	1	-3	2026-10-17 15:58:12.079
b23b4066-d01e-46f5-a30c-81cd8a9a5030	ab0337ae-4666-4966-8dcf-6ee5550f3e22	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	e1465a8b-d5b1-418e-abc1-9f5efba20c74	3	aa369254-a42b-4b36-a4cd-fd3624dca403	P	0	-8	2026-10-17 15:58:12.32
1396a893-6540-4b1f-8885-b8ab62da20db	32c34014-0bd9-4102-ad3a-5f84bc59a5a5	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	e1465a8b-d5b1-418e-abc1-9f5efba20c74	3	aa369254-a42b-4b36-a4cd-fd3624dca403	G	6	4	2026-10-17 15:58:12.32
c8a07950-2132-4e69-bc29-826e15b71393	b9547f9d-bcf3-416d-be8e-49747b939a79	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	e1465a8b-d5b1-418e-abc1-9f5efba20c74	4	4e5ba4a4-455a-45d1-aadb-ae47d00660be	G	9	2	2026-10-17 15:58:12.484
54b88514-ed0a-48ed-8edd-9d2beea90762	7d428867-6b12-452d-861e-a519d70dedd0	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	e1465a8b-d5b1-418e-abc1-9f5efba20c74	4	4e5ba4a4-455a-45d1-aadb-ae47d00660be	P	9	3	2026-10-17 15:58:12.484
fa6c035f-e045-4bbb-a1df-5ba9e47a5180	ab0337ae-4666-4966-8dcf-6ee5550f3e22	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	e1465a8b-d5b1-418e-abc1-9f5efba20c74	4	17d59921-c355-40cb-95b6-afd38c212124	P	0	-9	2026-10-17 15:58:12.666
394427c8-eb0b-4e61-a982-11ad7544f95c	b8ff9a76-bd82-424a-90d3-4cecfbf65b5f	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	e1465a8b-d5b1-418e-abc1-9f5efba20c74	4	17d59921-c355-40cb-95b6-afd38c212124	G	7	3	2026-10-17 15:58:12.666
9f400219-81c2-428a-b117-1d7b161f3cc9	4bde52dc-874c-4828-a3e8-eb1f6a7585b6	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	e1465a8b-d5b1-418e-abc1-9f5efba20c74	4	85e59089-be9a-4c45-9600-85a287009a56	G	4	-1	2026-10-17 15:58:12.872
2378e8f0-2845-4679-b55c-2703f5f6795d	32c34014-0bd9-4102-ad3a-5f84bc59a5a5	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	e1465a8b-d5b1-418e-abc1-9f5efba20c74	4	85e59089-be9a-4c45-9600-85a287009a56	P	6	2	2026-10-17 15:58:12.872
58fdfbfe-e9f0-480f-934d-fd89724a273f	b8ff9a76-bd82-424a-90d3-4cecfbf65b5f	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	e1465a8b-d5b1-418e-abc1-9f5efba20c74	5	164d663d-0e19-447b-9ac7-66262a7cdc5a	P	7	2	2026-10-17 15:58:13.282
0fb2c9f3-f057-435f-8c24-4bd88779193e	b9547f9d-bcf3-416d-be8e-49747b939a79	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	e1465a8b-d5b1-418e-abc1-9f5efba20c74	5	164d663d-0e19-447b-9ac7-66262a7cdc5a	G	12	3	2026-10-17 15:58:13.282
c4944dd9-7455-48f7-ac3f-1a5257b0d611	32c34014-0bd9-4102-ad3a-5f84bc59a5a5	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	e1465a8b-d5b1-418e-abc1-9f5efba20c74	5	5949d616-faf0-4dc8-a3d0-22f773454225	G	9	3	2026-10-17 15:58:13.488
f39f9fe6-2dd8-49f2-9c5b-a46d8e064a46	7d428867-6b12-452d-861e-a519d70dedd0	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	e1465a8b-d5b1-418e-abc1-9f5efba20c74	5	5949d616-faf0-4dc8-a3d0-22f773454225	P	9	2	2026-10-17 15:58:13.488
f4a2b32a-efb3-453e-9b1c-6fb852a117f4	4bde52dc-874c-4828-a3e8-eb1f6a7585b6	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	e1465a8b-d5b1-418e-abc1-9f5efba20c74	5	dcae3a01-e4b1-4b24-a590-52c23e701038	E	5	-1	2026-10-17 15:58:13.771
97efbef1-c630-4bf0-b0d9-6695fe2941c0	ab0337ae-4666-4966-8dcf-6ee5550f3e22	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	e1465a8b-d5b1-418e-abc1-9f5efba20c74	5	dcae3a01-e4b1-4b24-a590-52c23e701038	E	1	-9	2026-10-17 15:58:13.771
7d36c260-3732-497b-9edc-578c443405d7	b9547f9d-bcf3-416d-be8e-49747b939a79	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	e1465a8b-d5b1-418e-abc1-9f5efba20c74	6	9a8499dd-8f31-4e13-80f8-a835ff60c70f	G	15	5	2026-10-17 15:58:14.17
c9021de5-5ee4-4403-bc5e-7b17454eb933	32c34014-0bd9-4102-ad3a-5f84bc59a5a5	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	e1465a8b-d5b1-418e-abc1-9f5efba20c74	6	9a8499dd-8f31-4e13-80f8-a835ff60c70f	P	9	1	2026-10-17 15:58:14.17
378e0fcd-7ddb-41af-a7c1-5b8b2f0c5bee	4bde52dc-874c-4828-a3e8-eb1f6a7585b6	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	e1465a8b-d5b1-418e-abc1-9f5efba20c74	6	c5cbce55-1e3b-4300-b1b5-1255903f5a20	P	5	-2	2026-10-17 15:58:14.511
3958e6f9-2b40-4e41-8b82-06682837f7c5	b8ff9a76-bd82-424a-90d3-4cecfbf65b5f	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	e1465a8b-d5b1-418e-abc1-9f5efba20c74	6	c5cbce55-1e3b-4300-b1b5-1255903f5a20	G	10	3	2026-10-17 15:58:14.511
c3fab4c8-4aeb-4d69-a310-57e59c90f224	ab0337ae-4666-4966-8dcf-6ee5550f3e22	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	e1465a8b-d5b1-418e-abc1-9f5efba20c74	6	904e9388-81db-443f-87f6-3e3a39ea27f9	G	4	-8	2026-10-17 15:58:14.875
ebcaa30a-2264-4fea-ad11-6e2aae20e9ad	7d428867-6b12-452d-861e-a519d70dedd0	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	e1465a8b-d5b1-418e-abc1-9f5efba20c74	6	904e9388-81db-443f-87f6-3e3a39ea27f9	P	9	1	2026-10-17 15:58:14.875
208f64f9-7a6d-4fe3-b437-dcb39825f45c	b8ff9a76-bd82-424a-90d3-4cecfbf65b5f	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	e1465a8b-d5b1-418e-abc1-9f5efba20c74	7	f3caf4be-b9a0-4011-bd67-60aa8d81bcd5	G	13	4	2026-10-17 15:58:15.212
e5bc1b34-ee69-45b6-b59b-107c4e512ab2	32c34014-0bd9-4102-ad3a-5f84bc59a5a5	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	e1465a8b-d5b1-418e-abc1-9f5efba20c74	7	f3caf4be-b9a0-4011-bd67-60aa8d81bcd5	P	9	0	2026-10-17 15:58:15.212
df05450a-f96c-4bf0-9875-300372d69f13	b9547f9d-bcf3-416d-be8e-49747b939a79	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	e1465a8b-d5b1-418e-abc1-9f5efba20c74	7	ff95bca3-f823-4026-8c6f-3c94990de590	E	16	5	2026-10-17 15:58:15.485
26885b8b-ec7b-4bb3-bd7e-65d4d0beb36a	ab0337ae-4666-4966-8dcf-6ee5550f3e22	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	e1465a8b-d5b1-418e-abc1-9f5efba20c74	7	ff95bca3-f823-4026-8c6f-3c94990de590	E	5	-8	2026-10-17 15:58:15.485
\.


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

\unrestrict gwGgEqw71UbYoRue6SJCI47OMK9VCvk239WrNdH0jflT7ft0bLD2wI8ZTFkaRjc

