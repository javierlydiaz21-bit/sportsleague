--
-- PostgreSQL database dump
--

\restrict ibd6rePEQ0ZZdDd3GQQ1tImsjdO0dvcu1LveasXtRma5OJR6XNYM755QgNvUGOR

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

ALTER TABLE IF EXISTS ONLY public.referee_availability DROP CONSTRAINT IF EXISTS referee_availability_referee_id_fkey;
ALTER TABLE IF EXISTS ONLY public.referee_assignments DROP CONSTRAINT IF EXISTS referee_assignments_referee_id_fkey;
DROP INDEX IF EXISTS public.scheduled_matches_scheduled_at_idx;
DROP INDEX IF EXISTS public.scheduled_matches_league_id_idx;
DROP INDEX IF EXISTS public.referees_zone_idx;
DROP INDEX IF EXISTS public.referees_owner_id_email_key;
DROP INDEX IF EXISTS public.referees_email_idx;
DROP INDEX IF EXISTS public.referee_availability_referee_id_idx;
DROP INDEX IF EXISTS public.referee_assignments_referee_id_idx;
DROP INDEX IF EXISTS public.referee_assignments_match_id_referee_id_key;
DROP INDEX IF EXISTS public.referee_assignments_match_id_idx;
ALTER TABLE IF EXISTS ONLY public.scheduled_matches DROP CONSTRAINT IF EXISTS scheduled_matches_pkey;
ALTER TABLE IF EXISTS ONLY public.referees DROP CONSTRAINT IF EXISTS referees_pkey;
ALTER TABLE IF EXISTS ONLY public.referee_availability DROP CONSTRAINT IF EXISTS referee_availability_pkey;
ALTER TABLE IF EXISTS ONLY public.referee_assignments DROP CONSTRAINT IF EXISTS referee_assignments_pkey;
ALTER TABLE IF EXISTS ONLY public._prisma_migrations DROP CONSTRAINT IF EXISTS _prisma_migrations_pkey;
DROP TABLE IF EXISTS public.scheduled_matches;
DROP TABLE IF EXISTS public.referees;
DROP TABLE IF EXISTS public.referee_availability;
DROP TABLE IF EXISTS public.referee_assignments;
DROP TABLE IF EXISTS public._prisma_migrations;
DROP TYPE IF EXISTS public."AssignmentStatus";
--
-- Name: AssignmentStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."AssignmentStatus" AS ENUM (
    'ASSIGNED',
    'CONFIRMED',
    'DECLINED'
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
-- Name: referee_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.referee_assignments (
    id uuid NOT NULL,
    match_id uuid NOT NULL,
    referee_id uuid NOT NULL,
    scheduled_at timestamp(3) without time zone NOT NULL,
    confirmed boolean DEFAULT false NOT NULL,
    status public."AssignmentStatus" DEFAULT 'ASSIGNED'::public."AssignmentStatus" NOT NULL,
    manual boolean DEFAULT false NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: referee_availability; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.referee_availability (
    id uuid NOT NULL,
    referee_id uuid NOT NULL,
    day_of_week integer NOT NULL,
    start_time text NOT NULL,
    end_time text NOT NULL
);


--
-- Name: referees; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.referees (
    id uuid NOT NULL,
    owner_id uuid NOT NULL,
    league_id uuid,
    name text NOT NULL,
    email text NOT NULL,
    phone text,
    zone text NOT NULL,
    categories_certified text[],
    active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: scheduled_matches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scheduled_matches (
    match_id uuid NOT NULL,
    league_id uuid NOT NULL,
    league_name text,
    category_id uuid NOT NULL,
    owner_id uuid NOT NULL,
    round integer NOT NULL,
    label text NOT NULL,
    scheduled_at timestamp(3) without time zone NOT NULL,
    venue_name text,
    venue_zone text,
    status text DEFAULT 'SCHEDULED'::text NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
b4b25a12-523e-49ef-bcf6-5f6e15d7a7ef	579084e1718577622912739af7407ba516a0a234fce95c0505e7c798aaa175b3	2026-10-17 15:57:53.594787+00	20261011000000_init	\N	\N	2026-10-17 15:57:53.152625+00	1
\.


--
-- Data for Name: referee_assignments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.referee_assignments (id, match_id, referee_id, scheduled_at, confirmed, status, manual, created_at, updated_at) FROM stdin;
6f8412e1-fa25-4656-a22a-67f0ea847d11	5a68f769-52fd-43d5-a5f6-db37fe8cb545	bdcae905-9b02-4e8c-92e1-c62adc4996f1	2026-08-30 13:00:00	f	ASSIGNED	f	2026-10-17 15:58:05.689	2026-10-17 15:58:05.689
9ac6ff59-9f1f-4825-8a1e-3ae3277d86c5	68f2e9ed-483c-41e8-8dbb-50a0b76d7082	54019ba4-1b39-4501-b2c0-8a7492b81900	2026-08-30 19:00:00	f	ASSIGNED	f	2026-10-17 15:58:05.751	2026-10-17 15:58:05.751
9809c94d-1378-4616-9924-75a0d8be88ab	4f6fb652-5483-48de-9f65-fab75b5a1abc	54019ba4-1b39-4501-b2c0-8a7492b81900	2026-08-30 21:00:00	f	ASSIGNED	f	2026-10-17 15:58:05.789	2026-10-17 15:58:05.789
9ae50b0f-4ccb-4ca2-aab3-f39d56efd198	0d759168-6570-4058-9717-ae3c3ec90e42	3118ab51-b099-40bb-a49f-ddc2cf880aa0	2026-09-06 13:00:00	f	ASSIGNED	f	2026-10-17 15:58:05.843	2026-10-17 15:58:05.843
ca171cea-a3e5-4348-a1a6-67ffab63e044	a39c5742-4fdf-4c2a-894a-c5258fdaebc3	bdcae905-9b02-4e8c-92e1-c62adc4996f1	2026-09-06 15:00:00	f	ASSIGNED	f	2026-10-17 15:58:05.878	2026-10-17 15:58:05.878
a2821641-2bb1-4912-aae5-102d9e8f6c8f	7f6961be-530a-4365-8f72-70c525432a9c	54019ba4-1b39-4501-b2c0-8a7492b81900	2026-09-06 19:00:00	f	ASSIGNED	f	2026-10-17 15:58:05.924	2026-10-17 15:58:05.924
82a7a8fa-6ab0-43c4-a007-b1b07d529206	946b0e8d-5750-40d9-82c9-28963daa90c1	3118ab51-b099-40bb-a49f-ddc2cf880aa0	2026-09-13 13:00:00	f	ASSIGNED	f	2026-10-17 15:58:05.968	2026-10-17 15:58:05.968
ce60d270-2513-4bf5-b6de-f7a21e7d7340	58dd0ad4-afde-46cf-b2dd-b658a64cea8a	bdcae905-9b02-4e8c-92e1-c62adc4996f1	2026-09-13 15:00:00	f	ASSIGNED	f	2026-10-17 15:58:06.009	2026-10-17 15:58:06.009
90a6407b-6bd4-4149-b9b8-58c231ea3b4c	aa369254-a42b-4b36-a4cd-fd3624dca403	54019ba4-1b39-4501-b2c0-8a7492b81900	2026-09-13 19:00:00	f	ASSIGNED	f	2026-10-17 15:58:06.04	2026-10-17 15:58:06.04
f4e48b78-17de-4802-9c2f-41024273ac04	4e5ba4a4-455a-45d1-aadb-ae47d00660be	3118ab51-b099-40bb-a49f-ddc2cf880aa0	2026-09-20 13:00:00	f	ASSIGNED	f	2026-10-17 15:58:06.056	2026-10-17 15:58:06.056
82dd2129-63df-4f6f-9398-1ab0278ac8d2	17d59921-c355-40cb-95b6-afd38c212124	54019ba4-1b39-4501-b2c0-8a7492b81900	2026-09-20 19:00:00	f	ASSIGNED	f	2026-10-17 15:58:06.075	2026-10-17 15:58:06.075
e614492c-03de-43b0-831e-37db8e534f1e	85e59089-be9a-4c45-9600-85a287009a56	54019ba4-1b39-4501-b2c0-8a7492b81900	2026-09-20 21:00:00	f	ASSIGNED	f	2026-10-17 15:58:06.088	2026-10-17 15:58:06.088
1905cc6c-faa5-4467-bd80-1e615158ed9c	164d663d-0e19-447b-9ac7-66262a7cdc5a	bdcae905-9b02-4e8c-92e1-c62adc4996f1	2026-09-27 13:00:00	f	ASSIGNED	f	2026-10-17 15:58:06.111	2026-10-17 15:58:06.111
4e893d65-fcb9-46c4-88db-5aa8a7596c8e	5949d616-faf0-4dc8-a3d0-22f773454225	3118ab51-b099-40bb-a49f-ddc2cf880aa0	2026-09-27 15:00:00	f	ASSIGNED	f	2026-10-17 15:58:06.127	2026-10-17 15:58:06.127
57dc2048-175c-49f0-b6f4-053a0c414960	dcae3a01-e4b1-4b24-a590-52c23e701038	54019ba4-1b39-4501-b2c0-8a7492b81900	2026-09-27 19:00:00	f	ASSIGNED	f	2026-10-17 15:58:06.153	2026-10-17 15:58:06.153
26bb14d5-6fd7-4dd9-ac47-6a973e1f9137	9a8499dd-8f31-4e13-80f8-a835ff60c70f	bdcae905-9b02-4e8c-92e1-c62adc4996f1	2026-10-04 13:00:00	f	ASSIGNED	f	2026-10-17 15:58:06.179	2026-10-17 15:58:06.179
59d3de01-1a52-4132-b5bb-6bac604d1cb9	c5cbce55-1e3b-4300-b1b5-1255903f5a20	54019ba4-1b39-4501-b2c0-8a7492b81900	2026-10-04 19:00:00	f	ASSIGNED	f	2026-10-17 15:58:06.195	2026-10-17 15:58:06.195
881d33d0-348d-4242-86a3-ca535dcecb60	904e9388-81db-443f-87f6-3e3a39ea27f9	54019ba4-1b39-4501-b2c0-8a7492b81900	2026-10-04 21:00:00	f	ASSIGNED	f	2026-10-17 15:58:06.215	2026-10-17 15:58:06.215
a317a349-4c92-44df-af31-3956fc8ab5bf	f3caf4be-b9a0-4011-bd67-60aa8d81bcd5	bdcae905-9b02-4e8c-92e1-c62adc4996f1	2026-10-11 13:00:00	f	ASSIGNED	f	2026-10-17 15:58:06.238	2026-10-17 15:58:06.238
a70bfe71-87a5-4ebc-8e4a-def75e80aa26	ff95bca3-f823-4026-8c6f-3c94990de590	3118ab51-b099-40bb-a49f-ddc2cf880aa0	2026-10-11 15:00:00	f	ASSIGNED	f	2026-10-17 15:58:06.254	2026-10-17 15:58:06.254
a12c2ba2-14bc-436b-a2cd-cd886fabf845	69a81d41-8ee9-4cfb-9e1b-ad9658e7d583	54019ba4-1b39-4501-b2c0-8a7492b81900	2026-10-11 19:00:00	f	ASSIGNED	f	2026-10-17 15:58:06.276	2026-10-17 15:58:06.276
73f43657-79a9-49a0-8e2a-acca5a554155	c3ca84b4-19ca-4088-a77a-e592fcd477bd	bdcae905-9b02-4e8c-92e1-c62adc4996f1	2026-10-18 13:00:00	f	ASSIGNED	f	2026-10-17 15:58:06.293	2026-10-17 15:58:06.293
319b349f-60ce-42f2-bfc0-f18ea5e1c4e7	7de1b4d8-60b7-4305-bd48-d829131011ec	54019ba4-1b39-4501-b2c0-8a7492b81900	2026-10-18 21:00:00	f	ASSIGNED	f	2026-10-17 15:58:06.333	2026-10-17 15:58:06.333
b1712b35-ac5c-4268-88c2-a19fc6daeedd	e21b7998-cece-4d17-bea2-4a6065e62679	3118ab51-b099-40bb-a49f-ddc2cf880aa0	2026-10-25 13:00:00	f	ASSIGNED	f	2026-10-17 15:58:06.349	2026-10-17 15:58:06.349
39e2c75c-2bb5-49ef-b05b-99d9ea3334c9	88fa8f81-ea34-4686-b1e3-32d80a310fbb	3118ab51-b099-40bb-a49f-ddc2cf880aa0	2026-10-25 15:00:00	f	ASSIGNED	f	2026-10-17 15:58:06.372	2026-10-17 15:58:06.372
1a8e8df5-8b84-4d19-939a-0a604cbf324c	7f9f5a5f-6800-4ba4-ba6c-74a7b99ecfe3	54019ba4-1b39-4501-b2c0-8a7492b81900	2026-10-25 19:00:00	f	ASSIGNED	f	2026-10-17 15:58:06.388	2026-10-17 15:58:06.388
b476c227-94e4-419d-8d1e-43fc9db31394	3268d545-1a59-452e-b82c-453fa086b693	bdcae905-9b02-4e8c-92e1-c62adc4996f1	2026-11-01 13:00:00	f	ASSIGNED	f	2026-10-17 15:58:06.405	2026-10-17 15:58:06.405
aba35a5e-4b16-48d4-bcd4-6e116a05c9ec	16d20ed7-ad4c-4a43-8bdd-0ef6fd41cbd9	54019ba4-1b39-4501-b2c0-8a7492b81900	2026-11-01 19:00:00	f	ASSIGNED	f	2026-10-17 15:58:06.425	2026-10-17 15:58:06.425
3fb67704-834a-4600-ae3e-6d85f3917af4	7ad11e0e-d054-436e-b7ee-1b5b6a372600	54019ba4-1b39-4501-b2c0-8a7492b81900	2026-11-01 21:00:00	f	ASSIGNED	f	2026-10-17 15:58:06.453	2026-10-17 15:58:06.453
e4ae9136-45c4-418f-a177-fc0c27aa80c9	1d50a151-b0a5-47e7-a300-8f4e9a079ec9	54019ba4-1b39-4501-b2c0-8a7492b81900	2026-10-18 19:00:00	f	ASSIGNED	f	2026-10-17 15:58:06.312	2026-10-17 15:58:15.748
\.


--
-- Data for Name: referee_availability; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.referee_availability (id, referee_id, day_of_week, start_time, end_time) FROM stdin;
98a958d2-db47-48d7-bcf2-82df1c57aa45	bdcae905-9b02-4e8c-92e1-c62adc4996f1	0	07:00	20:00
773db6b2-bd9c-4891-9903-f106c42477c9	bdcae905-9b02-4e8c-92e1-c62adc4996f1	6	07:00	20:00
7d99b07b-eb76-47eb-9304-e8ccd771b557	f45d070d-8359-467f-a6e7-d274a7f9583c	0	07:00	20:00
3a3bd721-f022-4a09-bdf1-73c205b35d19	54019ba4-1b39-4501-b2c0-8a7492b81900	0	12:00	21:00
5770a2e2-0d8d-4bff-8cf2-0659d864977b	3118ab51-b099-40bb-a49f-ddc2cf880aa0	0	07:00	13:00
\.


--
-- Data for Name: referees; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.referees (id, owner_id, league_id, name, email, phone, zone, categories_certified, active, created_at, updated_at) FROM stdin;
bdcae905-9b02-4e8c-92e1-c62adc4996f1	ab7d9b35-97b6-4e00-b17e-ab915cd51696	e1465a8b-d5b1-418e-abc1-9f5efba20c74	Mario Arroyo	arbitro@demo.com	\N	Centro	{}	t	2026-10-17 15:58:04.826	2026-10-17 15:58:04.826
f45d070d-8359-467f-a6e7-d274a7f9583c	ab7d9b35-97b6-4e00-b17e-ab915cd51696	e1465a8b-d5b1-418e-abc1-9f5efba20c74	Pedro Lozano	pedro.lozano@demo.com	\N	Norte	{}	t	2026-10-17 15:58:04.867	2026-10-17 15:58:04.867
54019ba4-1b39-4501-b2c0-8a7492b81900	ab7d9b35-97b6-4e00-b17e-ab915cd51696	e1465a8b-d5b1-418e-abc1-9f5efba20c74	Ana Beltrán	ana.beltran@demo.com	\N	Sur	{}	t	2026-10-17 15:58:04.887	2026-10-17 15:58:04.887
3118ab51-b099-40bb-a49f-ddc2cf880aa0	ab7d9b35-97b6-4e00-b17e-ab915cd51696	e1465a8b-d5b1-418e-abc1-9f5efba20c74	Rafael Pacheco	rafael.pacheco@demo.com	\N	Centro	{}	t	2026-10-17 15:58:04.909	2026-10-17 15:58:04.909
\.


--
-- Data for Name: scheduled_matches; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.scheduled_matches (match_id, league_id, league_name, category_id, owner_id, round, label, scheduled_at, venue_name, venue_zone, status, updated_at) FROM stdin;
69a81d41-8ee9-4cfb-9e1b-ad9658e7d583	e1465a8b-d5b1-418e-abc1-9f5efba20c74	Liga Amateur de Montería	719a94f9-95a7-43d3-ba07-2f907d87c038	ab7d9b35-97b6-4e00-b17e-ab915cd51696	7	Atlético Cereté vs Halcones FC	2026-10-11 19:00:00	Polideportivo del Sur	Sur	SCHEDULED	2026-10-17 15:58:06.261
7de1b4d8-60b7-4305-bd48-d829131011ec	e1465a8b-d5b1-418e-abc1-9f5efba20c74	Liga Amateur de Montería	719a94f9-95a7-43d3-ba07-2f907d87c038	ab7d9b35-97b6-4e00-b17e-ab915cd51696	8	Atlético Cereté vs Real Lorica	2026-10-18 21:00:00	Polideportivo del Sur	Sur	SCHEDULED	2026-10-17 15:58:06.317
e21b7998-cece-4d17-bea2-4a6065e62679	e1465a8b-d5b1-418e-abc1-9f5efba20c74	Liga Amateur de Montería	719a94f9-95a7-43d3-ba07-2f907d87c038	ab7d9b35-97b6-4e00-b17e-ab915cd51696	9	Tigres del Sinú vs Leones de Montería	2026-10-25 13:00:00	Estadio Municipal de Montería	Centro	SCHEDULED	2026-10-17 15:58:06.337
88fa8f81-ea34-4686-b1e3-32d80a310fbb	e1465a8b-d5b1-418e-abc1-9f5efba20c74	Liga Amateur de Montería	719a94f9-95a7-43d3-ba07-2f907d87c038	ab7d9b35-97b6-4e00-b17e-ab915cd51696	9	Deportivo La Ribera vs Atlético Cereté	2026-10-25 15:00:00	Estadio Municipal de Montería	Centro	SCHEDULED	2026-10-17 15:58:06.356
7f9f5a5f-6800-4ba4-ba6c-74a7b99ecfe3	e1465a8b-d5b1-418e-abc1-9f5efba20c74	Liga Amateur de Montería	719a94f9-95a7-43d3-ba07-2f907d87c038	ab7d9b35-97b6-4e00-b17e-ab915cd51696	9	Halcones FC vs Real Lorica	2026-10-25 19:00:00	Polideportivo del Sur	Sur	SCHEDULED	2026-10-17 15:58:06.376
3268d545-1a59-452e-b82c-453fa086b693	e1465a8b-d5b1-418e-abc1-9f5efba20c74	Liga Amateur de Montería	719a94f9-95a7-43d3-ba07-2f907d87c038	ab7d9b35-97b6-4e00-b17e-ab915cd51696	10	Leones de Montería vs Atlético Cereté	2026-11-01 13:00:00	Estadio Municipal de Montería	Centro	SCHEDULED	2026-10-17 15:58:06.394
16d20ed7-ad4c-4a43-8bdd-0ef6fd41cbd9	e1465a8b-d5b1-418e-abc1-9f5efba20c74	Liga Amateur de Montería	719a94f9-95a7-43d3-ba07-2f907d87c038	ab7d9b35-97b6-4e00-b17e-ab915cd51696	10	Real Lorica vs Tigres del Sinú	2026-11-01 19:00:00	Polideportivo del Sur	Sur	SCHEDULED	2026-10-17 15:58:06.41
7ad11e0e-d054-436e-b7ee-1b5b6a372600	e1465a8b-d5b1-418e-abc1-9f5efba20c74	Liga Amateur de Montería	719a94f9-95a7-43d3-ba07-2f907d87c038	ab7d9b35-97b6-4e00-b17e-ab915cd51696	10	Halcones FC vs Deportivo La Ribera	2026-11-01 21:00:00	Polideportivo del Sur	Sur	SCHEDULED	2026-10-17 15:58:06.432
5a68f769-52fd-43d5-a5f6-db37fe8cb545	e1465a8b-d5b1-418e-abc1-9f5efba20c74	Liga Amateur de Montería	719a94f9-95a7-43d3-ba07-2f907d87c038	ab7d9b35-97b6-4e00-b17e-ab915cd51696	1	Tigres del Sinú vs Atlético Cereté	2026-08-30 13:00:00	Estadio Municipal de Montería	Centro	FINISHED	2026-10-17 15:58:10.03
68f2e9ed-483c-41e8-8dbb-50a0b76d7082	e1465a8b-d5b1-418e-abc1-9f5efba20c74	Liga Amateur de Montería	719a94f9-95a7-43d3-ba07-2f907d87c038	ab7d9b35-97b6-4e00-b17e-ab915cd51696	1	Deportivo La Ribera vs Real Lorica	2026-08-30 19:00:00	Polideportivo del Sur	Sur	FINISHED	2026-10-17 15:58:10.381
4f6fb652-5483-48de-9f65-fab75b5a1abc	e1465a8b-d5b1-418e-abc1-9f5efba20c74	Liga Amateur de Montería	719a94f9-95a7-43d3-ba07-2f907d87c038	ab7d9b35-97b6-4e00-b17e-ab915cd51696	1	Halcones FC vs Leones de Montería	2026-08-30 21:00:00	Polideportivo del Sur	Sur	FINISHED	2026-10-17 15:58:10.641
0d759168-6570-4058-9717-ae3c3ec90e42	e1465a8b-d5b1-418e-abc1-9f5efba20c74	Liga Amateur de Montería	719a94f9-95a7-43d3-ba07-2f907d87c038	ab7d9b35-97b6-4e00-b17e-ab915cd51696	2	Deportivo La Ribera vs Tigres del Sinú	2026-09-06 13:00:00	Estadio Municipal de Montería	Centro	FINISHED	2026-10-17 15:58:10.949
a39c5742-4fdf-4c2a-894a-c5258fdaebc3	e1465a8b-d5b1-418e-abc1-9f5efba20c74	Liga Amateur de Montería	719a94f9-95a7-43d3-ba07-2f907d87c038	ab7d9b35-97b6-4e00-b17e-ab915cd51696	2	Leones de Montería vs Real Lorica	2026-09-06 15:00:00	Estadio Municipal de Montería	Centro	FINISHED	2026-10-17 15:58:11.278
7f6961be-530a-4365-8f72-70c525432a9c	e1465a8b-d5b1-418e-abc1-9f5efba20c74	Liga Amateur de Montería	719a94f9-95a7-43d3-ba07-2f907d87c038	ab7d9b35-97b6-4e00-b17e-ab915cd51696	2	Halcones FC vs Atlético Cereté	2026-09-06 19:00:00	Polideportivo del Sur	Sur	FINISHED	2026-10-17 15:58:11.574
946b0e8d-5750-40d9-82c9-28963daa90c1	e1465a8b-d5b1-418e-abc1-9f5efba20c74	Liga Amateur de Montería	719a94f9-95a7-43d3-ba07-2f907d87c038	ab7d9b35-97b6-4e00-b17e-ab915cd51696	3	Tigres del Sinú vs Halcones FC	2026-09-13 13:00:00	Estadio Municipal de Montería	Centro	FINISHED	2026-10-17 15:58:11.903
58dd0ad4-afde-46cf-b2dd-b658a64cea8a	e1465a8b-d5b1-418e-abc1-9f5efba20c74	Liga Amateur de Montería	719a94f9-95a7-43d3-ba07-2f907d87c038	ab7d9b35-97b6-4e00-b17e-ab915cd51696	3	Real Lorica vs Atlético Cereté	2026-09-13 15:00:00	Estadio Municipal de Montería	Centro	FINISHED	2026-10-17 15:58:12.095
aa369254-a42b-4b36-a4cd-fd3624dca403	e1465a8b-d5b1-418e-abc1-9f5efba20c74	Liga Amateur de Montería	719a94f9-95a7-43d3-ba07-2f907d87c038	ab7d9b35-97b6-4e00-b17e-ab915cd51696	3	Leones de Montería vs Deportivo La Ribera	2026-09-13 19:00:00	Polideportivo del Sur	Sur	FINISHED	2026-10-17 15:58:12.329
4e5ba4a4-455a-45d1-aadb-ae47d00660be	e1465a8b-d5b1-418e-abc1-9f5efba20c74	Liga Amateur de Montería	719a94f9-95a7-43d3-ba07-2f907d87c038	ab7d9b35-97b6-4e00-b17e-ab915cd51696	4	Real Lorica vs Halcones FC	2026-09-20 13:00:00	Estadio Municipal de Montería	Centro	FINISHED	2026-10-17 15:58:12.496
17d59921-c355-40cb-95b6-afd38c212124	e1465a8b-d5b1-418e-abc1-9f5efba20c74	Liga Amateur de Montería	719a94f9-95a7-43d3-ba07-2f907d87c038	ab7d9b35-97b6-4e00-b17e-ab915cd51696	4	Leones de Montería vs Tigres del Sinú	2026-09-20 19:00:00	Polideportivo del Sur	Sur	FINISHED	2026-10-17 15:58:12.689
85e59089-be9a-4c45-9600-85a287009a56	e1465a8b-d5b1-418e-abc1-9f5efba20c74	Liga Amateur de Montería	719a94f9-95a7-43d3-ba07-2f907d87c038	ab7d9b35-97b6-4e00-b17e-ab915cd51696	4	Atlético Cereté vs Deportivo La Ribera	2026-09-20 21:00:00	Polideportivo del Sur	Sur	FINISHED	2026-10-17 15:58:12.886
164d663d-0e19-447b-9ac7-66262a7cdc5a	e1465a8b-d5b1-418e-abc1-9f5efba20c74	Liga Amateur de Montería	719a94f9-95a7-43d3-ba07-2f907d87c038	ab7d9b35-97b6-4e00-b17e-ab915cd51696	5	Tigres del Sinú vs Real Lorica	2026-09-27 13:00:00	Estadio Municipal de Montería	Centro	FINISHED	2026-10-17 15:58:13.298
5949d616-faf0-4dc8-a3d0-22f773454225	e1465a8b-d5b1-418e-abc1-9f5efba20c74	Liga Amateur de Montería	719a94f9-95a7-43d3-ba07-2f907d87c038	ab7d9b35-97b6-4e00-b17e-ab915cd51696	5	Deportivo La Ribera vs Halcones FC	2026-09-27 15:00:00	Estadio Municipal de Montería	Centro	FINISHED	2026-10-17 15:58:13.5
dcae3a01-e4b1-4b24-a590-52c23e701038	e1465a8b-d5b1-418e-abc1-9f5efba20c74	Liga Amateur de Montería	719a94f9-95a7-43d3-ba07-2f907d87c038	ab7d9b35-97b6-4e00-b17e-ab915cd51696	5	Atlético Cereté vs Leones de Montería	2026-09-27 19:00:00	Polideportivo del Sur	Sur	FINISHED	2026-10-17 15:58:13.792
9a8499dd-8f31-4e13-80f8-a835ff60c70f	e1465a8b-d5b1-418e-abc1-9f5efba20c74	Liga Amateur de Montería	719a94f9-95a7-43d3-ba07-2f907d87c038	ab7d9b35-97b6-4e00-b17e-ab915cd51696	6	Real Lorica vs Deportivo La Ribera	2026-10-04 13:00:00	Estadio Municipal de Montería	Centro	FINISHED	2026-10-17 15:58:14.195
c5cbce55-1e3b-4300-b1b5-1255903f5a20	e1465a8b-d5b1-418e-abc1-9f5efba20c74	Liga Amateur de Montería	719a94f9-95a7-43d3-ba07-2f907d87c038	ab7d9b35-97b6-4e00-b17e-ab915cd51696	6	Atlético Cereté vs Tigres del Sinú	2026-10-04 19:00:00	Polideportivo del Sur	Sur	FINISHED	2026-10-17 15:58:14.534
904e9388-81db-443f-87f6-3e3a39ea27f9	e1465a8b-d5b1-418e-abc1-9f5efba20c74	Liga Amateur de Montería	719a94f9-95a7-43d3-ba07-2f907d87c038	ab7d9b35-97b6-4e00-b17e-ab915cd51696	6	Leones de Montería vs Halcones FC	2026-10-04 21:00:00	Polideportivo del Sur	Sur	FINISHED	2026-10-17 15:58:14.893
f3caf4be-b9a0-4011-bd67-60aa8d81bcd5	e1465a8b-d5b1-418e-abc1-9f5efba20c74	Liga Amateur de Montería	719a94f9-95a7-43d3-ba07-2f907d87c038	ab7d9b35-97b6-4e00-b17e-ab915cd51696	7	Tigres del Sinú vs Deportivo La Ribera	2026-10-11 13:00:00	Estadio Municipal de Montería	Centro	FINISHED	2026-10-17 15:58:15.229
ff95bca3-f823-4026-8c6f-3c94990de590	e1465a8b-d5b1-418e-abc1-9f5efba20c74	Liga Amateur de Montería	719a94f9-95a7-43d3-ba07-2f907d87c038	ab7d9b35-97b6-4e00-b17e-ab915cd51696	7	Real Lorica vs Leones de Montería	2026-10-11 15:00:00	Estadio Municipal de Montería	Centro	FINISHED	2026-10-17 15:58:15.499
c3ca84b4-19ca-4088-a77a-e592fcd477bd	e1465a8b-d5b1-418e-abc1-9f5efba20c74	Liga Amateur de Montería	719a94f9-95a7-43d3-ba07-2f907d87c038	ab7d9b35-97b6-4e00-b17e-ab915cd51696	8	Deportivo La Ribera vs Leones de Montería	2026-10-18 13:00:00	Estadio Municipal de Montería	Centro	SUSPENDED	2026-10-17 15:58:15.66
1d50a151-b0a5-47e7-a300-8f4e9a079ec9	e1465a8b-d5b1-418e-abc1-9f5efba20c74	Liga Amateur de Montería	719a94f9-95a7-43d3-ba07-2f907d87c038	ab7d9b35-97b6-4e00-b17e-ab915cd51696	8	Halcones FC vs Tigres del Sinú	2026-10-18 19:00:00	Polideportivo del Sur	Sur	SCHEDULED	2026-10-17 15:58:15.729
\.


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: referee_assignments referee_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referee_assignments
    ADD CONSTRAINT referee_assignments_pkey PRIMARY KEY (id);


--
-- Name: referee_availability referee_availability_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referee_availability
    ADD CONSTRAINT referee_availability_pkey PRIMARY KEY (id);


--
-- Name: referees referees_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referees
    ADD CONSTRAINT referees_pkey PRIMARY KEY (id);


--
-- Name: scheduled_matches scheduled_matches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduled_matches
    ADD CONSTRAINT scheduled_matches_pkey PRIMARY KEY (match_id);


--
-- Name: referee_assignments_match_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX referee_assignments_match_id_idx ON public.referee_assignments USING btree (match_id);


--
-- Name: referee_assignments_match_id_referee_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX referee_assignments_match_id_referee_id_key ON public.referee_assignments USING btree (match_id, referee_id);


--
-- Name: referee_assignments_referee_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX referee_assignments_referee_id_idx ON public.referee_assignments USING btree (referee_id);


--
-- Name: referee_availability_referee_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX referee_availability_referee_id_idx ON public.referee_availability USING btree (referee_id);


--
-- Name: referees_email_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX referees_email_idx ON public.referees USING btree (email);


--
-- Name: referees_owner_id_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX referees_owner_id_email_key ON public.referees USING btree (owner_id, email);


--
-- Name: referees_zone_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX referees_zone_idx ON public.referees USING btree (zone);


--
-- Name: scheduled_matches_league_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX scheduled_matches_league_id_idx ON public.scheduled_matches USING btree (league_id);


--
-- Name: scheduled_matches_scheduled_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX scheduled_matches_scheduled_at_idx ON public.scheduled_matches USING btree (scheduled_at);


--
-- Name: referee_assignments referee_assignments_referee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referee_assignments
    ADD CONSTRAINT referee_assignments_referee_id_fkey FOREIGN KEY (referee_id) REFERENCES public.referees(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: referee_availability referee_availability_referee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referee_availability
    ADD CONSTRAINT referee_availability_referee_id_fkey FOREIGN KEY (referee_id) REFERENCES public.referees(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict ibd6rePEQ0ZZdDd3GQQ1tImsjdO0dvcu1LveasXtRma5OJR6XNYM755QgNvUGOR

