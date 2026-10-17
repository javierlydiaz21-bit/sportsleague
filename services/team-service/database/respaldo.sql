--
-- PostgreSQL database dump
--

\restrict qVn2NR4FNrhsM6pi6xbY2QfFH6ly0yyEySRAdPsgIOqXgde3Ukw80NoYdyReHOC

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

ALTER TABLE IF EXISTS ONLY public.players DROP CONSTRAINT IF EXISTS players_team_id_fkey;
DROP INDEX IF EXISTS public.teams_league_id_idx;
DROP INDEX IF EXISTS public.teams_category_id_name_key;
DROP INDEX IF EXISTS public.teams_category_id_idx;
DROP INDEX IF EXISTS public.players_team_id_jersey_number_key;
DROP INDEX IF EXISTS public.players_team_id_idx;
ALTER TABLE IF EXISTS ONLY public.teams DROP CONSTRAINT IF EXISTS teams_pkey;
ALTER TABLE IF EXISTS ONLY public.players DROP CONSTRAINT IF EXISTS players_pkey;
ALTER TABLE IF EXISTS ONLY public._prisma_migrations DROP CONSTRAINT IF EXISTS _prisma_migrations_pkey;
DROP TABLE IF EXISTS public.teams;
DROP TABLE IF EXISTS public.players;
DROP TABLE IF EXISTS public._prisma_migrations;
DROP TYPE IF EXISTS public."EligibilityStatus";
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
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
c0083134-8743-4a09-9b21-b31067552224	72fee2d978849a5df7614396769caee28f70e4988bf10427ec883422ea4412c5	2026-10-17 15:57:49.544273+00	20261011000000_init	\N	\N	2026-10-17 15:57:49.187996+00	1
\.


--
-- Data for Name: players; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.players (id, team_id, first_name, last_name, document_id, birth_date, jersey_number, "position", eligibility_status, eligibility_note, registration_doc_url, created_at, updated_at) FROM stdin;
269fd093-e0b6-493b-9d42-ed4d6e468ad1	b8ff9a76-bd82-424a-90d3-4cecfbf65b5f	Felipe	Hernández Ortiz	\N	1999-02-07	1	Arquero	ELIGIBLE	Edad 27: dentro del rango de la categoría	\N	2026-10-17 15:58:04.193	2026-10-17 15:58:04.193
be9c0186-5e1e-419b-9742-d8ba505cb888	b8ff9a76-bd82-424a-90d3-4cecfbf65b5f	Óscar	Cárdenas Hernández	\N	1988-01-18	2	Defensa	ELIGIBLE	Edad 38: dentro del rango de la categoría	\N	2026-10-17 15:58:04.193	2026-10-17 15:58:04.193
e16d9440-7c44-4d4a-8220-b3170fa5826e	b8ff9a76-bd82-424a-90d3-4cecfbf65b5f	Sebastián	Rodríguez Martínez	\N	1994-05-26	3	Defensa	ELIGIBLE	Edad 32: dentro del rango de la categoría	\N	2026-10-17 15:58:04.193	2026-10-17 15:58:04.193
8eada780-c616-453f-b1da-d37878f417a1	b8ff9a76-bd82-424a-90d3-4cecfbf65b5f	Daniel	Pérez García	\N	1993-10-27	4	Defensa	ELIGIBLE	Edad 32: dentro del rango de la categoría	\N	2026-10-17 15:58:04.193	2026-10-17 15:58:04.193
74315dc0-0c78-4041-aaee-041ae16cbeb6	b8ff9a76-bd82-424a-90d3-4cecfbf65b5f	Ricardo	Mejía Hernández	\N	1993-05-09	5	Defensa	ELIGIBLE	Edad 33: dentro del rango de la categoría	\N	2026-10-17 15:58:04.193	2026-10-17 15:58:04.193
2c5dbb22-8c7d-4028-a086-9960429e5872	b8ff9a76-bd82-424a-90d3-4cecfbf65b5f	Julián	Ríos Hernández	\N	2005-01-02	6	Mediocampista	ELIGIBLE	Edad 21: dentro del rango de la categoría	\N	2026-10-17 15:58:04.193	2026-10-17 15:58:04.193
7adbf640-933e-4c30-ba3c-69f3ee8fa78c	b8ff9a76-bd82-424a-90d3-4cecfbf65b5f	Santiago	Cárdenas Mejía	\N	1995-12-19	7	Mediocampista	ELIGIBLE	Edad 30: dentro del rango de la categoría	\N	2026-10-17 15:58:04.193	2026-10-17 15:58:04.193
1e86b5d6-fcb9-4c2d-92f0-1c8b2cc4fcc7	b8ff9a76-bd82-424a-90d3-4cecfbf65b5f	David	Torres Pérez	\N	2006-03-28	8	Mediocampista	ELIGIBLE	Edad 20: dentro del rango de la categoría	\N	2026-10-17 15:58:04.193	2026-10-17 15:58:04.193
601ee585-515b-41a9-9ae8-1a7c534fad42	b8ff9a76-bd82-424a-90d3-4cecfbf65b5f	Alejandro	Hernández Castro	\N	1991-12-17	9	Mediocampista	ELIGIBLE	Edad 34: dentro del rango de la categoría	\N	2026-10-17 15:58:04.193	2026-10-17 15:58:04.193
8bdc4a4d-2cc7-4ff9-9ca1-6c9ddcf68085	b8ff9a76-bd82-424a-90d3-4cecfbf65b5f	Javier	Mejía Morales	\N	1996-07-23	10	Delantero	ELIGIBLE	Edad 30: dentro del rango de la categoría	\N	2026-10-17 15:58:04.193	2026-10-17 15:58:04.193
4cb149f2-eb9c-469a-a987-9baec8d1510a	b8ff9a76-bd82-424a-90d3-4cecfbf65b5f	Esteban	Rojas Ortiz	\N	2006-05-01	11	Delantero	ELIGIBLE	Edad 20: dentro del rango de la categoría	\N	2026-10-17 15:58:04.193	2026-10-17 15:58:04.193
3779d490-b0b6-439b-8887-cdf782dcc23d	ab0337ae-4666-4966-8dcf-6ee5550f3e22	Luis	Gómez Arrieta	\N	2005-03-05	1	Arquero	ELIGIBLE	Edad 21: dentro del rango de la categoría	\N	2026-10-17 15:58:04.291	2026-10-17 15:58:04.291
08d29d9c-a3c8-48a0-be82-59c97bb4be2d	ab0337ae-4666-4966-8dcf-6ee5550f3e22	Felipe	Rojas Hernández	\N	2006-11-01	2	Defensa	ELIGIBLE	Edad 19: dentro del rango de la categoría	\N	2026-10-17 15:58:04.291	2026-10-17 15:58:04.291
2b9e9cc7-6c1f-4b1a-950d-3946646bae19	ab0337ae-4666-4966-8dcf-6ee5550f3e22	Fabián	Morales Montes	\N	1992-08-16	3	Defensa	ELIGIBLE	Edad 34: dentro del rango de la categoría	\N	2026-10-17 15:58:04.291	2026-10-17 15:58:04.291
a7b530d6-91ad-49fa-a74a-f4dea67a14d3	ab0337ae-4666-4966-8dcf-6ee5550f3e22	Juan	Arrieta Montes	\N	2006-10-01	4	Defensa	ELIGIBLE	Edad 20: dentro del rango de la categoría	\N	2026-10-17 15:58:04.291	2026-10-17 15:58:04.291
269cd2c4-1e8c-447d-bb07-9d72c90f4bae	ab0337ae-4666-4966-8dcf-6ee5550f3e22	Ricardo	Arrieta Castro	\N	1996-01-07	5	Defensa	ELIGIBLE	Edad 30: dentro del rango de la categoría	\N	2026-10-17 15:58:04.291	2026-10-17 15:58:04.291
ad540c56-bbf7-43e9-bcc5-1cb1a77cee0d	ab0337ae-4666-4966-8dcf-6ee5550f3e22	Alejandro	Arrieta Rojas	\N	1991-02-14	6	Mediocampista	ELIGIBLE	Edad 35: dentro del rango de la categoría	\N	2026-10-17 15:58:04.291	2026-10-17 15:58:04.291
0371dd2e-5211-4123-aba7-4933f1340a58	ab0337ae-4666-4966-8dcf-6ee5550f3e22	Fabián	Ríos García	\N	1994-09-24	7	Mediocampista	ELIGIBLE	Edad 32: dentro del rango de la categoría	\N	2026-10-17 15:58:04.291	2026-10-17 15:58:04.291
8d26ec30-f63a-47e9-946f-ef274c5a23b7	ab0337ae-4666-4966-8dcf-6ee5550f3e22	Miguel	Morales Arrieta	\N	1988-07-04	8	Mediocampista	ELIGIBLE	Edad 38: dentro del rango de la categoría	\N	2026-10-17 15:58:04.291	2026-10-17 15:58:04.291
755bc1d8-3166-4263-b896-8ee6a6a56be0	ab0337ae-4666-4966-8dcf-6ee5550f3e22	David	Morales García	\N	1992-04-05	9	Mediocampista	ELIGIBLE	Edad 34: dentro del rango de la categoría	\N	2026-10-17 15:58:04.291	2026-10-17 15:58:04.291
844a5e7f-12de-4cd4-8bf1-d5d9c2354b41	ab0337ae-4666-4966-8dcf-6ee5550f3e22	Javier	Torres Gómez	\N	1995-05-26	10	Delantero	ELIGIBLE	Edad 31: dentro del rango de la categoría	\N	2026-10-17 15:58:04.291	2026-10-17 15:58:04.291
6096c91a-22c9-4f4a-9be1-913ee4e36c0b	ab0337ae-4666-4966-8dcf-6ee5550f3e22	Alejandro	Ortiz Mejía	\N	1994-03-14	11	Delantero	ELIGIBLE	Edad 32: dentro del rango de la categoría	\N	2026-10-17 15:58:04.291	2026-10-17 15:58:04.291
e157fb7f-2532-4b59-8b9e-a86c5a9e15cb	7d428867-6b12-452d-861e-a519d70dedd0	Jorge	Gómez Rodríguez	\N	2006-02-23	1	Arquero	ELIGIBLE	Edad 20: dentro del rango de la categoría	\N	2026-10-17 15:58:04.39	2026-10-17 15:58:04.39
778a3e3d-3d8c-4185-bf00-f517f088fc6f	7d428867-6b12-452d-861e-a519d70dedd0	Fabián	Rodríguez Martínez	\N	1991-04-26	2	Defensa	ELIGIBLE	Edad 35: dentro del rango de la categoría	\N	2026-10-17 15:58:04.39	2026-10-17 15:58:04.39
aa231e0c-a3a5-47bb-a54a-5efebae2c4d3	7d428867-6b12-452d-861e-a519d70dedd0	Carlos	Hernández Pérez	\N	1999-07-28	3	Defensa	ELIGIBLE	Edad 27: dentro del rango de la categoría	\N	2026-10-17 15:58:04.39	2026-10-17 15:58:04.39
9edd93a4-cd4d-4363-9fbf-cc2069f173b3	7d428867-6b12-452d-861e-a519d70dedd0	Santiago	Vargas Rojas	\N	2000-11-15	4	Defensa	ELIGIBLE	Edad 25: dentro del rango de la categoría	\N	2026-10-17 15:58:04.39	2026-10-17 15:58:04.39
5cb78e8d-7ed3-4780-80d0-6608acad8b98	7d428867-6b12-452d-861e-a519d70dedd0	Sebastián	Ortiz Mejía	\N	1990-05-12	5	Defensa	ELIGIBLE	Edad 36: dentro del rango de la categoría	\N	2026-10-17 15:58:04.39	2026-10-17 15:58:04.39
fb4d6be8-6542-4411-ab48-0f91bcf0e83b	7d428867-6b12-452d-861e-a519d70dedd0	Camilo	Rodríguez Martínez	\N	1994-01-13	6	Mediocampista	ELIGIBLE	Edad 32: dentro del rango de la categoría	\N	2026-10-17 15:58:04.39	2026-10-17 15:58:04.39
4738ecef-4c60-4253-bba8-cb7236dd2965	7d428867-6b12-452d-861e-a519d70dedd0	Felipe	Martínez García	\N	1993-09-20	7	Mediocampista	ELIGIBLE	Edad 33: dentro del rango de la categoría	\N	2026-10-17 15:58:04.39	2026-10-17 15:58:04.39
86926ba1-a6f9-45c6-a51e-1f955c81ca2e	7d428867-6b12-452d-861e-a519d70dedd0	Diego	Rodríguez García	\N	2004-12-25	8	Mediocampista	ELIGIBLE	Edad 21: dentro del rango de la categoría	\N	2026-10-17 15:58:04.39	2026-10-17 15:58:04.39
e1bcf075-9d5f-47e5-a312-3161f3ebf3fe	7d428867-6b12-452d-861e-a519d70dedd0	Óscar	Martínez Hernández	\N	1995-12-16	9	Mediocampista	ELIGIBLE	Edad 30: dentro del rango de la categoría	\N	2026-10-17 15:58:04.39	2026-10-17 15:58:04.39
ce7df7d4-1165-4d57-b331-fd91520ea101	7d428867-6b12-452d-861e-a519d70dedd0	Diego	Petro Castro	\N	1996-07-23	10	Delantero	ELIGIBLE	Edad 30: dentro del rango de la categoría	\N	2026-10-17 15:58:04.39	2026-10-17 15:58:04.39
71dabb7a-9a3f-4d38-b51f-2e8b7ecf5c78	7d428867-6b12-452d-861e-a519d70dedd0	Esteban	García Petro	\N	2012-03-14	11	Delantero	INELIGIBLE	Tiene 14 años; la categoría exige mínimo 16	\N	2026-10-17 15:58:04.39	2026-10-17 15:58:04.39
72db8247-2b5a-44d6-ae9e-4aae7f98c210	32c34014-0bd9-4102-ad3a-5f84bc59a5a5	Luis	Rodríguez Díaz	\N	1990-02-01	1	Arquero	ELIGIBLE	Edad 36: dentro del rango de la categoría	\N	2026-10-17 15:58:04.517	2026-10-17 15:58:04.517
bd7cd450-c692-4ead-848e-c4b70650099f	32c34014-0bd9-4102-ad3a-5f84bc59a5a5	Diego	Pérez Ortiz	\N	1996-01-17	2	Defensa	ELIGIBLE	Edad 30: dentro del rango de la categoría	\N	2026-10-17 15:58:04.517	2026-10-17 15:58:04.517
b062519d-e5e4-4ed8-b57d-62cb1d829e54	32c34014-0bd9-4102-ad3a-5f84bc59a5a5	Carlos	Torres Gómez	\N	1995-05-14	3	Defensa	ELIGIBLE	Edad 31: dentro del rango de la categoría	\N	2026-10-17 15:58:04.517	2026-10-17 15:58:04.517
160028e8-4b07-4661-ba51-98892b016375	32c34014-0bd9-4102-ad3a-5f84bc59a5a5	Daniel	Rojas Ríos	\N	1995-06-04	4	Defensa	ELIGIBLE	Edad 31: dentro del rango de la categoría	\N	2026-10-17 15:58:04.517	2026-10-17 15:58:04.517
7bb81a69-8e03-4e84-9837-07872b4af129	32c34014-0bd9-4102-ad3a-5f84bc59a5a5	Esteban	Cárdenas Cárdenas	\N	2000-04-21	5	Defensa	ELIGIBLE	Edad 26: dentro del rango de la categoría	\N	2026-10-17 15:58:04.517	2026-10-17 15:58:04.517
92b054a9-575f-4928-b646-ff6c1ed3bc9f	32c34014-0bd9-4102-ad3a-5f84bc59a5a5	Esteban	Rodríguez Suárez	\N	2001-07-04	6	Mediocampista	ELIGIBLE	Edad 25: dentro del rango de la categoría	\N	2026-10-17 15:58:04.517	2026-10-17 15:58:04.517
b2ac9fa5-7edc-44cc-be36-0b233e1e1418	32c34014-0bd9-4102-ad3a-5f84bc59a5a5	Fabián	Vargas Vargas	\N	1997-08-20	7	Mediocampista	ELIGIBLE	Edad 29: dentro del rango de la categoría	\N	2026-10-17 15:58:04.517	2026-10-17 15:58:04.517
741aea41-b62a-4bd7-8832-815295dcc985	32c34014-0bd9-4102-ad3a-5f84bc59a5a5	Ricardo	Torres Torres	\N	2002-11-01	8	Mediocampista	ELIGIBLE	Edad 23: dentro del rango de la categoría	\N	2026-10-17 15:58:04.517	2026-10-17 15:58:04.517
3824aa99-5cdc-40e3-91a3-a8a71b9c6e8e	32c34014-0bd9-4102-ad3a-5f84bc59a5a5	Fabián	Rojas Martínez	\N	1993-12-17	9	Mediocampista	ELIGIBLE	Edad 32: dentro del rango de la categoría	\N	2026-10-17 15:58:04.517	2026-10-17 15:58:04.517
f7ef7de8-1dda-4fae-9ceb-3cee4765060e	32c34014-0bd9-4102-ad3a-5f84bc59a5a5	Alejandro	Montes Arrieta	\N	2005-04-10	10	Delantero	ELIGIBLE	Edad 21: dentro del rango de la categoría	\N	2026-10-17 15:58:04.517	2026-10-17 15:58:04.517
7bb2df2e-cf3f-4da1-9686-43dd8e2cb409	32c34014-0bd9-4102-ad3a-5f84bc59a5a5	Óscar	Rodríguez Díaz	\N	2000-06-24	11	Delantero	ELIGIBLE	Edad 26: dentro del rango de la categoría	\N	2026-10-17 15:58:04.517	2026-10-17 15:58:04.517
5d6c4528-574e-4961-8e9d-4b432ba70b59	4bde52dc-874c-4828-a3e8-eb1f6a7585b6	Santiago	García Ortiz	\N	2004-10-07	1	Arquero	ELIGIBLE	Edad 22: dentro del rango de la categoría	\N	2026-10-17 15:58:04.605	2026-10-17 15:58:04.605
77b42736-a8d7-4c82-b0c2-db9e2f19cef2	4bde52dc-874c-4828-a3e8-eb1f6a7585b6	Mateo	Pérez Vargas	\N	1990-10-16	2	Defensa	ELIGIBLE	Edad 36: dentro del rango de la categoría	\N	2026-10-17 15:58:04.605	2026-10-17 15:58:04.605
101659a1-52ef-4d81-991e-9522a983b6df	4bde52dc-874c-4828-a3e8-eb1f6a7585b6	David	Vargas Arrieta	\N	1994-06-28	3	Defensa	ELIGIBLE	Edad 32: dentro del rango de la categoría	\N	2026-10-17 15:58:04.605	2026-10-17 15:58:04.605
384cc74e-b0ef-4dd5-a9a5-dd4c7e03f676	4bde52dc-874c-4828-a3e8-eb1f6a7585b6	Ricardo	Montes Vargas	\N	2004-12-27	4	Defensa	ELIGIBLE	Edad 21: dentro del rango de la categoría	\N	2026-10-17 15:58:04.605	2026-10-17 15:58:04.605
01184fb7-e226-4467-9ac7-8a19e0d45d06	4bde52dc-874c-4828-a3e8-eb1f6a7585b6	Juan	Martínez Rojas	\N	1992-02-13	5	Defensa	ELIGIBLE	Edad 34: dentro del rango de la categoría	\N	2026-10-17 15:58:04.605	2026-10-17 15:58:04.605
cbf92789-ceba-440b-8293-a04cf3a44438	4bde52dc-874c-4828-a3e8-eb1f6a7585b6	Andrés	Rojas Rodríguez	\N	2003-07-11	6	Mediocampista	ELIGIBLE	Edad 23: dentro del rango de la categoría	\N	2026-10-17 15:58:04.605	2026-10-17 15:58:04.605
f6dcee74-5e3f-41b0-ada3-04eb7c564fb4	4bde52dc-874c-4828-a3e8-eb1f6a7585b6	David	Martínez Martínez	\N	1999-07-25	7	Mediocampista	ELIGIBLE	Edad 27: dentro del rango de la categoría	\N	2026-10-17 15:58:04.605	2026-10-17 15:58:04.605
7449a5c8-e7b3-4bef-8443-366909536aeb	4bde52dc-874c-4828-a3e8-eb1f6a7585b6	Alejandro	Torres Torres	\N	2005-04-11	8	Mediocampista	ELIGIBLE	Edad 21: dentro del rango de la categoría	\N	2026-10-17 15:58:04.605	2026-10-17 15:58:04.605
aa347f47-fd15-4057-b372-341bf315ac60	4bde52dc-874c-4828-a3e8-eb1f6a7585b6	Sebastián	Castro García	\N	1999-05-02	9	Mediocampista	ELIGIBLE	Edad 27: dentro del rango de la categoría	\N	2026-10-17 15:58:04.605	2026-10-17 15:58:04.605
41a9cf80-1f8b-4cf2-a9f2-f2af6ad5a6ed	4bde52dc-874c-4828-a3e8-eb1f6a7585b6	Carlos	Vargas Vargas	\N	1993-04-27	10	Delantero	ELIGIBLE	Edad 33: dentro del rango de la categoría	\N	2026-10-17 15:58:04.605	2026-10-17 15:58:04.605
8505e4f8-41de-4c73-b55a-47b81fbc594f	4bde52dc-874c-4828-a3e8-eb1f6a7585b6	Julián	Cárdenas Gómez	\N	1999-08-06	11	Delantero	ELIGIBLE	Edad 27: dentro del rango de la categoría	\N	2026-10-17 15:58:04.605	2026-10-17 15:58:04.605
d3ff7f35-1534-40b6-bcdc-a15bcd1ba339	b9547f9d-bcf3-416d-be8e-49747b939a79	Andrés	Ramírez Montes	\N	2001-06-03	1	Arquero	ELIGIBLE	Edad 25: dentro del rango de la categoría	\N	2026-10-17 15:58:04.695	2026-10-17 15:58:04.695
9d72f898-848d-487f-ae0f-eb9ed02c7a0f	b9547f9d-bcf3-416d-be8e-49747b939a79	Nicolás	Mejía Montes	\N	2001-11-21	2	Defensa	ELIGIBLE	Edad 24: dentro del rango de la categoría	\N	2026-10-17 15:58:04.695	2026-10-17 15:58:04.695
886662ea-c1c2-42c5-b64d-4dfde135ce42	b9547f9d-bcf3-416d-be8e-49747b939a79	Luis	García García	\N	1990-09-26	3	Defensa	ELIGIBLE	Edad 36: dentro del rango de la categoría	\N	2026-10-17 15:58:04.695	2026-10-17 15:58:04.695
08438700-0dc6-4e7e-ac68-e1636ce9c7c9	b9547f9d-bcf3-416d-be8e-49747b939a79	Diego	Morales Vargas	\N	1996-01-25	4	Defensa	ELIGIBLE	Edad 30: dentro del rango de la categoría	\N	2026-10-17 15:58:04.695	2026-10-17 15:58:04.695
885f2113-15c5-41d9-a41e-99b83e867eae	b9547f9d-bcf3-416d-be8e-49747b939a79	Sebastián	Torres Ramírez	\N	1995-03-16	5	Defensa	ELIGIBLE	Edad 31: dentro del rango de la categoría	\N	2026-10-17 15:58:04.695	2026-10-17 15:58:04.695
48441d20-0dfa-4453-bb78-6dd42ca6c47c	b9547f9d-bcf3-416d-be8e-49747b939a79	Camilo	Ortiz Martínez	\N	1996-11-27	6	Mediocampista	ELIGIBLE	Edad 29: dentro del rango de la categoría	\N	2026-10-17 15:58:04.695	2026-10-17 15:58:04.695
e6bf9b81-f443-43ad-8c6c-17458c46a101	b9547f9d-bcf3-416d-be8e-49747b939a79	Camilo	García Petro	\N	2004-05-18	7	Mediocampista	ELIGIBLE	Edad 22: dentro del rango de la categoría	\N	2026-10-17 15:58:04.695	2026-10-17 15:58:04.695
52f47a80-8889-4dad-803e-2256a066e060	b9547f9d-bcf3-416d-be8e-49747b939a79	Felipe	Pérez Ramírez	\N	2001-10-21	8	Mediocampista	ELIGIBLE	Edad 24: dentro del rango de la categoría	\N	2026-10-17 15:58:04.695	2026-10-17 15:58:04.695
43b7d63b-4482-4954-b77a-c63d50efc242	b9547f9d-bcf3-416d-be8e-49747b939a79	Santiago	Petro Torres	\N	1994-04-05	9	Mediocampista	ELIGIBLE	Edad 32: dentro del rango de la categoría	\N	2026-10-17 15:58:04.695	2026-10-17 15:58:04.695
bfa3606e-f2f2-48d5-94c4-f3c0bb3c8cd6	b9547f9d-bcf3-416d-be8e-49747b939a79	Daniel	Castro Ríos	\N	2002-09-09	10	Delantero	ELIGIBLE	Edad 24: dentro del rango de la categoría	\N	2026-10-17 15:58:04.695	2026-10-17 15:58:04.695
979e5cad-d17d-4ef6-95b6-390786de3a84	b9547f9d-bcf3-416d-be8e-49747b939a79	Carlos	Torres Ramírez	\N	1994-07-22	11	Delantero	ELIGIBLE	Edad 32: dentro del rango de la categoría	\N	2026-10-17 15:58:04.695	2026-10-17 15:58:04.695
\.


--
-- Data for Name: teams; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.teams (id, name, league_id, category_id, owner_id, home_venue_id, coach_name, contact_email, color, created_at, updated_at) FROM stdin;
b8ff9a76-bd82-424a-90d3-4cecfbf65b5f	Tigres del Sinú	e1465a8b-d5b1-418e-abc1-9f5efba20c74	719a94f9-95a7-43d3-ba07-2f907d87c038	ab7d9b35-97b6-4e00-b17e-ab915cd51696	2c8a9776-a71a-4b29-a20b-eda40aeece3e	Hernán Arrieta	tigres.del.sinu@demo.com	#16a34a	2026-10-17 15:58:04.122	2026-10-17 15:58:04.122
ab0337ae-4666-4966-8dcf-6ee5550f3e22	Leones de Montería	e1465a8b-d5b1-418e-abc1-9f5efba20c74	719a94f9-95a7-43d3-ba07-2f907d87c038	ab7d9b35-97b6-4e00-b17e-ab915cd51696	\N	Rubén Mestra	leones.de.monteria@demo.com	#2563eb	2026-10-17 15:58:04.251	2026-10-17 15:58:04.251
7d428867-6b12-452d-861e-a519d70dedd0	Halcones FC	e1465a8b-d5b1-418e-abc1-9f5efba20c74	719a94f9-95a7-43d3-ba07-2f907d87c038	ab7d9b35-97b6-4e00-b17e-ab915cd51696	c0898445-bca0-43f8-ad8f-960eacbd8e33	Wilson Petro	halcones.fc@demo.com	#ca8a04	2026-10-17 15:58:04.341	2026-10-17 15:58:04.341
32c34014-0bd9-4102-ad3a-5f84bc59a5a5	Deportivo La Ribera	e1465a8b-d5b1-418e-abc1-9f5efba20c74	719a94f9-95a7-43d3-ba07-2f907d87c038	ab7d9b35-97b6-4e00-b17e-ab915cd51696	af04cb38-0151-4f6b-adc9-f969302ba382	Álvaro Doria	deportivo.la.ribera@demo.com	#dc2626	2026-10-17 15:58:04.455	2026-10-17 15:58:04.455
4bde52dc-874c-4828-a3e8-eb1f6a7585b6	Atlético Cereté	e1465a8b-d5b1-418e-abc1-9f5efba20c74	719a94f9-95a7-43d3-ba07-2f907d87c038	ab7d9b35-97b6-4e00-b17e-ab915cd51696	\N	Edgar Pastrana	atletico.cerete@demo.com	#059669	2026-10-17 15:58:04.572	2026-10-17 15:58:04.572
b9547f9d-bcf3-416d-be8e-49747b939a79	Real Lorica	e1465a8b-d5b1-418e-abc1-9f5efba20c74	719a94f9-95a7-43d3-ba07-2f907d87c038	ab7d9b35-97b6-4e00-b17e-ab915cd51696	\N	Jaime Cogollo	real.lorica@demo.com	#ea580c	2026-10-17 15:58:04.655	2026-10-17 15:58:04.655
\.


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

\unrestrict qVn2NR4FNrhsM6pi6xbY2QfFH6ly0yyEySRAdPsgIOqXgde3Ukw80NoYdyReHOC

