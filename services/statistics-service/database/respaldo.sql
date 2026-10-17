--
-- PostgreSQL database dump
--

\restrict DwHtNdMjP0UGHTRDWGmFGuQfBQkRTQTEkPLkH7eqH5IThdL7kBkf7o9K2KI11Pq

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

DROP INDEX IF EXISTS public.top_scorers_season_id_goals_idx;
DROP INDEX IF EXISTS public.top_scorers_season_id_category_id_player_id_key;
DROP INDEX IF EXISTS public.standings_season_id_team_id_idx;
DROP INDEX IF EXISTS public.standings_season_id_category_id_team_id_key;
DROP INDEX IF EXISTS public.match_results_season_id_category_id_idx;
DROP INDEX IF EXISTS public.disciplinary_records_season_id_category_id_player_id_key;
DROP INDEX IF EXISTS public.disciplinary_records_player_id_idx;
ALTER TABLE IF EXISTS ONLY public.top_scorers DROP CONSTRAINT IF EXISTS top_scorers_pkey;
ALTER TABLE IF EXISTS ONLY public.standings DROP CONSTRAINT IF EXISTS standings_pkey;
ALTER TABLE IF EXISTS ONLY public.match_results DROP CONSTRAINT IF EXISTS match_results_pkey;
ALTER TABLE IF EXISTS ONLY public.disciplinary_records DROP CONSTRAINT IF EXISTS disciplinary_records_pkey;
ALTER TABLE IF EXISTS ONLY public._prisma_migrations DROP CONSTRAINT IF EXISTS _prisma_migrations_pkey;
DROP TABLE IF EXISTS public.top_scorers;
DROP TABLE IF EXISTS public.standings;
DROP TABLE IF EXISTS public.match_results;
DROP TABLE IF EXISTS public.disciplinary_records;
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
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
2e35321f-c0b6-49fd-8bb8-3c47c77bdccf	72419f2903068ef780c0046b79ff69031b05f39815bbfc3b72c0ee1c6a96f615	2026-10-17 15:57:52.121781+00	20261011000000_init	\N	\N	2026-10-17 15:57:51.83028+00	1
\.


--
-- Data for Name: disciplinary_records; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.disciplinary_records (id, season_id, category_id, player_id, team_id, yellow_cards, red_cards) FROM stdin;
168c1737-06d3-4803-a588-8d953de4cb6e	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	384cc74e-b0ef-4dd5-a9a5-dd4c7e03f676	4bde52dc-874c-4828-a3e8-eb1f6a7585b6	0	1
99c1ee47-d9d6-4a0a-87ee-e8648343f674	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	e16d9440-7c44-4d4a-8220-b3170fa5826e	b8ff9a76-bd82-424a-90d3-4cecfbf65b5f	2	0
07507a50-6d7c-4ac7-b705-9cd3bfc49f1f	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	885f2113-15c5-41d9-a41e-99b83e867eae	b9547f9d-bcf3-416d-be8e-49747b939a79	2	0
abb9531f-27f8-43f7-a9a5-df25e0cf636b	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	6096c91a-22c9-4f4a-9be1-913ee4e36c0b	ab0337ae-4666-4966-8dcf-6ee5550f3e22	2	0
90424e65-66bc-4a83-9bce-4a6b0ab11538	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	ad540c56-bbf7-43e9-bcc5-1cb1a77cee0d	ab0337ae-4666-4966-8dcf-6ee5550f3e22	2	0
d95d5a8d-5a89-4b61-bba7-59e9cc687064	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	8505e4f8-41de-4c73-b55a-47b81fbc594f	4bde52dc-874c-4828-a3e8-eb1f6a7585b6	2	0
48740d37-8f26-4f1c-95eb-6bdebe03bf3b	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	160028e8-4b07-4661-ba51-98892b016375	32c34014-0bd9-4102-ad3a-5f84bc59a5a5	1	0
16f49921-dd31-49d4-80cd-917d51aab848	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	e157fb7f-2532-4b59-8b9e-a86c5a9e15cb	7d428867-6b12-452d-861e-a519d70dedd0	1	0
31b3a6a8-7195-4760-baaf-b3208aa331f0	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	2b9e9cc7-6c1f-4b1a-950d-3946646bae19	ab0337ae-4666-4966-8dcf-6ee5550f3e22	1	0
5152c96d-3b33-45e0-ac5a-cabcd8f08572	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	2c5dbb22-8c7d-4028-a086-9960429e5872	b8ff9a76-bd82-424a-90d3-4cecfbf65b5f	1	0
d5ed194e-f6ac-4ce3-8c04-e057bc243e02	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	844a5e7f-12de-4cd4-8bf1-d5d9c2354b41	ab0337ae-4666-4966-8dcf-6ee5550f3e22	1	0
bd47857b-52de-431d-bda5-d003884f6e4d	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	755bc1d8-3166-4263-b896-8ee6a6a56be0	ab0337ae-4666-4966-8dcf-6ee5550f3e22	1	0
cf47e61b-d9fb-40a5-9773-fd08086851d0	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	41a9cf80-1f8b-4cf2-a9f2-f2af6ad5a6ed	4bde52dc-874c-4828-a3e8-eb1f6a7585b6	1	0
2e474ad7-b66e-4acb-abc7-bb231f1f37d6	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	5d6c4528-574e-4961-8e9d-4b432ba70b59	4bde52dc-874c-4828-a3e8-eb1f6a7585b6	1	0
edba3431-384a-4d0f-afe1-3fc2a76ff441	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	5cb78e8d-7ed3-4780-80d0-6608acad8b98	7d428867-6b12-452d-861e-a519d70dedd0	1	0
aca9d19e-ffbe-4236-92a6-dfe185e93e8a	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	86926ba1-a6f9-45c6-a51e-1f955c81ca2e	7d428867-6b12-452d-861e-a519d70dedd0	1	0
8904ff73-e033-48c5-8717-ce52409ffbd8	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	269fd093-e0b6-493b-9d42-ed4d6e468ad1	b8ff9a76-bd82-424a-90d3-4cecfbf65b5f	1	0
2d424901-bb6f-4377-9fd2-1a87f18eea9d	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	fb4d6be8-6542-4411-ab48-0f91bcf0e83b	7d428867-6b12-452d-861e-a519d70dedd0	1	0
f1118fa4-3316-446e-8bf4-d6e94ee86764	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	b062519d-e5e4-4ed8-b57d-62cb1d829e54	32c34014-0bd9-4102-ad3a-5f84bc59a5a5	1	0
14667efd-1981-412c-bb6a-a3254d22c1fc	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	52f47a80-8889-4dad-803e-2256a066e060	b9547f9d-bcf3-416d-be8e-49747b939a79	1	0
d57297cc-450e-4990-8de5-14d09573b305	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	cbf92789-ceba-440b-8293-a04cf3a44438	4bde52dc-874c-4828-a3e8-eb1f6a7585b6	1	0
992c2ed2-e08b-470e-ae72-ab4fbc9f4d7d	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	b2ac9fa5-7edc-44cc-be36-0b233e1e1418	32c34014-0bd9-4102-ad3a-5f84bc59a5a5	1	0
6a75cc6a-d635-49c4-8fc8-ddda578296f2	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	f7ef7de8-1dda-4fae-9ceb-3cee4765060e	32c34014-0bd9-4102-ad3a-5f84bc59a5a5	1	0
e67bf0d2-cc3e-4b4f-9abc-6aecac6a61f9	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	9d72f898-848d-487f-ae0f-eb9ed02c7a0f	b9547f9d-bcf3-416d-be8e-49747b939a79	1	0
70bc3f4f-3e0b-4029-b40e-80cd8e1c3a65	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	e6bf9b81-f443-43ad-8c6c-17458c46a101	b9547f9d-bcf3-416d-be8e-49747b939a79	1	0
98e274c8-6315-4f91-b3ff-7d45d613349d	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	8eada780-c616-453f-b1da-d37878f417a1	b8ff9a76-bd82-424a-90d3-4cecfbf65b5f	1	0
a606ea39-1b55-4a78-844c-2da1ecea4c9a	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	7adbf640-933e-4c30-ba3c-69f3ee8fa78c	b8ff9a76-bd82-424a-90d3-4cecfbf65b5f	1	0
a318dd83-b323-4362-9c99-b124bf2f3809	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	4cb149f2-eb9c-469a-a987-9baec8d1510a	b8ff9a76-bd82-424a-90d3-4cecfbf65b5f	1	0
b80fa749-8323-4ea8-9201-cfa309f75b33	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	08d29d9c-a3c8-48a0-be82-59c97bb4be2d	ab0337ae-4666-4966-8dcf-6ee5550f3e22	1	0
6bde6871-9012-4312-8aad-9bb8e89038a2	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	ce7df7d4-1165-4d57-b331-fd91520ea101	7d428867-6b12-452d-861e-a519d70dedd0	1	0
a0764f90-9d65-4fa5-ae93-ea975e8bef37	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	72db8247-2b5a-44d6-ae9e-4aae7f98c210	32c34014-0bd9-4102-ad3a-5f84bc59a5a5	1	0
\.


--
-- Data for Name: match_results; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.match_results (match_id, league_id, season_id, category_id, owner_id, home_team_id, away_team_id, home_score, away_score, version, completed_at, events, updated_at) FROM stdin;
5a68f769-52fd-43d5-a5f6-db37fe8cb545	e1465a8b-d5b1-418e-abc1-9f5efba20c74	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	ab7d9b35-97b6-4e00-b17e-ab915cd51696	b8ff9a76-bd82-424a-90d3-4cecfbf65b5f	4bde52dc-874c-4828-a3e8-eb1f6a7585b6	0	0	1	2026-10-17 15:58:10.008	[{"id": "a41018ad-4ff6-437d-8ac3-47b7130e5c0d", "type": "SUBSTITUTION", "value": 1, "minute": 57, "teamId": "b8ff9a76-bd82-424a-90d3-4cecfbf65b5f", "playerId": "be9c0186-5e1e-419b-9742-d8ba505cb888", "playerInId": "e16d9440-7c44-4d4a-8220-b3170fa5826e"}, {"id": "f413b498-3823-4413-88fc-7b26fc533bb3", "type": "SUBSTITUTION", "value": 1, "minute": 57, "teamId": "4bde52dc-874c-4828-a3e8-eb1f6a7585b6", "playerId": "41a9cf80-1f8b-4cf2-a9f2-f2af6ad5a6ed", "playerInId": "8505e4f8-41de-4c73-b55a-47b81fbc594f"}, {"id": "eb6a393e-1c99-4776-945b-d040b9cf819e", "type": "YELLOW_CARD", "value": 1, "minute": 77, "teamId": "b8ff9a76-bd82-424a-90d3-4cecfbf65b5f", "playerId": "e16d9440-7c44-4d4a-8220-b3170fa5826e", "playerInId": null}]	2026-10-17 15:58:10.039
68f2e9ed-483c-41e8-8dbb-50a0b76d7082	e1465a8b-d5b1-418e-abc1-9f5efba20c74	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	ab7d9b35-97b6-4e00-b17e-ab915cd51696	32c34014-0bd9-4102-ad3a-5f84bc59a5a5	b9547f9d-bcf3-416d-be8e-49747b939a79	4	1	1	2026-10-17 15:58:10.366	[{"id": "11f540dd-f4c1-43df-82b5-da6da654e4fb", "type": "GOAL", "value": 1, "minute": 10, "teamId": "32c34014-0bd9-4102-ad3a-5f84bc59a5a5", "playerId": "f7ef7de8-1dda-4fae-9ceb-3cee4765060e", "playerInId": null}, {"id": "d4741b5c-2bbd-46c1-83a6-8fd17816e5d2", "type": "YELLOW_CARD", "value": 1, "minute": 11, "teamId": "32c34014-0bd9-4102-ad3a-5f84bc59a5a5", "playerId": "160028e8-4b07-4661-ba51-98892b016375", "playerInId": null}, {"id": "b48dc8d9-e5f7-4699-9901-af52e54cbfba", "type": "GOAL", "value": 1, "minute": 18, "teamId": "32c34014-0bd9-4102-ad3a-5f84bc59a5a5", "playerId": "92b054a9-575f-4928-b646-ff6c1ed3bc9f", "playerInId": null}, {"id": "a71102e4-eff8-4bac-b14d-7fdb4243b468", "type": "GOAL", "value": 1, "minute": 37, "teamId": "32c34014-0bd9-4102-ad3a-5f84bc59a5a5", "playerId": "92b054a9-575f-4928-b646-ff6c1ed3bc9f", "playerInId": null}, {"id": "29ce34de-bfd0-4915-b3ff-6c7b711a680e", "type": "GOAL", "value": 1, "minute": 39, "teamId": "b9547f9d-bcf3-416d-be8e-49747b939a79", "playerId": "979e5cad-d17d-4ef6-95b6-390786de3a84", "playerInId": null}, {"id": "8425c1a0-5a08-46e9-a2b8-e5008883b458", "type": "GOAL", "value": 1, "minute": 65, "teamId": "32c34014-0bd9-4102-ad3a-5f84bc59a5a5", "playerId": "f7ef7de8-1dda-4fae-9ceb-3cee4765060e", "playerInId": null}, {"id": "72aa9825-a01c-4880-b326-7f5c62d5e537", "type": "SUBSTITUTION", "value": 1, "minute": 70, "teamId": "32c34014-0bd9-4102-ad3a-5f84bc59a5a5", "playerId": "7bb2df2e-cf3f-4da1-9686-43dd8e2cb409", "playerInId": "f7ef7de8-1dda-4fae-9ceb-3cee4765060e"}, {"id": "883ea897-94d7-49f7-ae24-26d555a9c5f8", "type": "SUBSTITUTION", "value": 1, "minute": 71, "teamId": "b9547f9d-bcf3-416d-be8e-49747b939a79", "playerId": "9d72f898-848d-487f-ae0f-eb9ed02c7a0f", "playerInId": "886662ea-c1c2-42c5-b64d-4dfde135ce42"}, {"id": "cc47d2c5-e9ac-4058-8bbd-cbc43017f099", "type": "YELLOW_CARD", "value": 1, "minute": 80, "teamId": "b9547f9d-bcf3-416d-be8e-49747b939a79", "playerId": "885f2113-15c5-41d9-a41e-99b83e867eae", "playerInId": null}]	2026-10-17 15:58:10.387
4f6fb652-5483-48de-9f65-fab75b5a1abc	e1465a8b-d5b1-418e-abc1-9f5efba20c74	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	ab7d9b35-97b6-4e00-b17e-ab915cd51696	7d428867-6b12-452d-861e-a519d70dedd0	ab0337ae-4666-4966-8dcf-6ee5550f3e22	1	0	1	2026-10-17 15:58:10.624	[{"id": "cf3218b6-84e1-4f36-a5bb-5dc434597fb2", "type": "SUBSTITUTION", "value": 1, "minute": 65, "teamId": "7d428867-6b12-452d-861e-a519d70dedd0", "playerId": "778a3e3d-3d8c-4185-bf00-f517f088fc6f", "playerInId": "aa231e0c-a3a5-47bb-a54a-5efebae2c4d3"}, {"id": "b0118a2d-97e3-40c7-9130-c14b94b8a10b", "type": "YELLOW_CARD", "value": 1, "minute": 67, "teamId": "ab0337ae-4666-4966-8dcf-6ee5550f3e22", "playerId": "6096c91a-22c9-4f4a-9be1-913ee4e36c0b", "playerInId": null}, {"id": "735b9d7b-bd2d-425f-99b6-bb54f5644aa0", "type": "SUBSTITUTION", "value": 1, "minute": 70, "teamId": "ab0337ae-4666-4966-8dcf-6ee5550f3e22", "playerId": "755bc1d8-3166-4263-b896-8ee6a6a56be0", "playerInId": "ad540c56-bbf7-43e9-bcc5-1cb1a77cee0d"}, {"id": "ea839099-fe68-460b-9cf6-56ad939edf51", "type": "YELLOW_CARD", "value": 1, "minute": 76, "teamId": "7d428867-6b12-452d-861e-a519d70dedd0", "playerId": "e157fb7f-2532-4b59-8b9e-a86c5a9e15cb", "playerInId": null}, {"id": "10592590-e37f-42d6-94a8-5b8f6ba6d8fc", "type": "YELLOW_CARD", "value": 1, "minute": 79, "teamId": "ab0337ae-4666-4966-8dcf-6ee5550f3e22", "playerId": "2b9e9cc7-6c1f-4b1a-950d-3946646bae19", "playerInId": null}, {"id": "98d93b7a-deeb-4f4d-93da-1b1e63a9a54d", "type": "GOAL", "value": 1, "minute": 81, "teamId": "7d428867-6b12-452d-861e-a519d70dedd0", "playerId": "86926ba1-a6f9-45c6-a51e-1f955c81ca2e", "playerInId": null}]	2026-10-17 15:58:10.645
0d759168-6570-4058-9717-ae3c3ec90e42	e1465a8b-d5b1-418e-abc1-9f5efba20c74	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	ab7d9b35-97b6-4e00-b17e-ab915cd51696	32c34014-0bd9-4102-ad3a-5f84bc59a5a5	b8ff9a76-bd82-424a-90d3-4cecfbf65b5f	1	4	1	2026-10-17 15:58:10.938	[{"id": "9e9685c2-22e8-4fd7-89f5-baedfdbecbea", "type": "GOAL", "value": 1, "minute": 19, "teamId": "b8ff9a76-bd82-424a-90d3-4cecfbf65b5f", "playerId": "7adbf640-933e-4c30-ba3c-69f3ee8fa78c", "playerInId": null}, {"id": "6e2e7698-f241-48c2-ae17-f0cd7cb2bd04", "type": "GOAL", "value": 1, "minute": 29, "teamId": "b8ff9a76-bd82-424a-90d3-4cecfbf65b5f", "playerId": "4cb149f2-eb9c-469a-a987-9baec8d1510a", "playerInId": null}, {"id": "99693c59-9072-4c50-ab10-d4945eda7302", "type": "GOAL", "value": 1, "minute": 30, "teamId": "b8ff9a76-bd82-424a-90d3-4cecfbf65b5f", "playerId": "7adbf640-933e-4c30-ba3c-69f3ee8fa78c", "playerInId": null}, {"id": "65157c80-b246-45ef-b8c9-038f0dcecf97", "type": "YELLOW_CARD", "value": 1, "minute": 37, "teamId": "b8ff9a76-bd82-424a-90d3-4cecfbf65b5f", "playerId": "2c5dbb22-8c7d-4028-a086-9960429e5872", "playerInId": null}, {"id": "40763bd9-b5de-4197-8697-1ae4d2a67214", "type": "SUBSTITUTION", "value": 1, "minute": 76, "teamId": "b8ff9a76-bd82-424a-90d3-4cecfbf65b5f", "playerId": "8eada780-c616-453f-b1da-d37878f417a1", "playerInId": "be9c0186-5e1e-419b-9742-d8ba505cb888"}, {"id": "57d8fde1-84c0-410a-a1b7-17b0b3145b95", "type": "SUBSTITUTION", "value": 1, "minute": 78, "teamId": "32c34014-0bd9-4102-ad3a-5f84bc59a5a5", "playerId": "7bb81a69-8e03-4e84-9837-07872b4af129", "playerInId": "bd7cd450-c692-4ead-848e-c4b70650099f"}, {"id": "7c4fcc9b-1b67-4268-a491-be73e8a9e587", "type": "GOAL", "value": 1, "minute": 85, "teamId": "b8ff9a76-bd82-424a-90d3-4cecfbf65b5f", "playerId": "2c5dbb22-8c7d-4028-a086-9960429e5872", "playerInId": null}, {"id": "312a25cb-5f76-44c1-a79d-8e6a8214a879", "type": "GOAL", "value": 1, "minute": 88, "teamId": "32c34014-0bd9-4102-ad3a-5f84bc59a5a5", "playerId": "7bb2df2e-cf3f-4da1-9686-43dd8e2cb409", "playerInId": null}]	2026-10-17 15:58:10.954
a39c5742-4fdf-4c2a-894a-c5258fdaebc3	e1465a8b-d5b1-418e-abc1-9f5efba20c74	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	ab7d9b35-97b6-4e00-b17e-ab915cd51696	ab0337ae-4666-4966-8dcf-6ee5550f3e22	b9547f9d-bcf3-416d-be8e-49747b939a79	1	4	1	2026-10-17 15:58:11.267	[{"id": "c16d4184-3c26-4f45-8331-3ab1c585dfa1", "type": "GOAL", "value": 1, "minute": 11, "teamId": "b9547f9d-bcf3-416d-be8e-49747b939a79", "playerId": "48441d20-0dfa-4453-bb78-6dd42ca6c47c", "playerInId": null}, {"id": "896fbfc1-8e8e-41d7-a690-6368e3f5b119", "type": "GOAL", "value": 1, "minute": 19, "teamId": "ab0337ae-4666-4966-8dcf-6ee5550f3e22", "playerId": "8d26ec30-f63a-47e9-946f-ef274c5a23b7", "playerInId": null}, {"id": "fccafea5-fb3d-4580-9cd9-d70862b5ca54", "type": "GOAL", "value": 1, "minute": 40, "teamId": "b9547f9d-bcf3-416d-be8e-49747b939a79", "playerId": "48441d20-0dfa-4453-bb78-6dd42ca6c47c", "playerInId": null}, {"id": "804b0a9c-111d-493b-92d8-a886502f1003", "type": "YELLOW_CARD", "value": 1, "minute": 51, "teamId": "ab0337ae-4666-4966-8dcf-6ee5550f3e22", "playerId": "844a5e7f-12de-4cd4-8bf1-d5d9c2354b41", "playerInId": null}, {"id": "b932af9f-8095-45b2-a145-0544f45c708d", "type": "YELLOW_CARD", "value": 1, "minute": 56, "teamId": "ab0337ae-4666-4966-8dcf-6ee5550f3e22", "playerId": "755bc1d8-3166-4263-b896-8ee6a6a56be0", "playerInId": null}, {"id": "a1333f78-9a43-45cc-b2a9-2346c5d2a451", "type": "SUBSTITUTION", "value": 1, "minute": 57, "teamId": "ab0337ae-4666-4966-8dcf-6ee5550f3e22", "playerId": "a7b530d6-91ad-49fa-a74a-f4dea67a14d3", "playerInId": "08d29d9c-a3c8-48a0-be82-59c97bb4be2d"}, {"id": "e82bf05a-9113-4d8b-a08f-1bb9c8fbc0a0", "type": "GOAL", "value": 1, "minute": 67, "teamId": "b9547f9d-bcf3-416d-be8e-49747b939a79", "playerId": "979e5cad-d17d-4ef6-95b6-390786de3a84", "playerInId": null}, {"id": "0cc380a5-b365-4485-bcec-18360ae382ab", "type": "YELLOW_CARD", "value": 1, "minute": 74, "teamId": "b9547f9d-bcf3-416d-be8e-49747b939a79", "playerId": "885f2113-15c5-41d9-a41e-99b83e867eae", "playerInId": null}, {"id": "d67c764e-0915-4044-a642-eee3846c17b1", "type": "SUBSTITUTION", "value": 1, "minute": 74, "teamId": "b9547f9d-bcf3-416d-be8e-49747b939a79", "playerId": "43b7d63b-4482-4954-b77a-c63d50efc242", "playerInId": "48441d20-0dfa-4453-bb78-6dd42ca6c47c"}, {"id": "9127b99c-93b3-412b-b58d-5bc378f3efe2", "type": "GOAL", "value": 1, "minute": 81, "teamId": "b9547f9d-bcf3-416d-be8e-49747b939a79", "playerId": "e6bf9b81-f443-43ad-8c6c-17458c46a101", "playerInId": null}]	2026-10-17 15:58:11.286
7f6961be-530a-4365-8f72-70c525432a9c	e1465a8b-d5b1-418e-abc1-9f5efba20c74	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	ab7d9b35-97b6-4e00-b17e-ab915cd51696	7d428867-6b12-452d-861e-a519d70dedd0	4bde52dc-874c-4828-a3e8-eb1f6a7585b6	2	0	1	2026-10-17 15:58:11.562	[{"id": "865437cc-42be-48f1-990d-4a177669ac4b", "type": "YELLOW_CARD", "value": 1, "minute": 39, "teamId": "4bde52dc-874c-4828-a3e8-eb1f6a7585b6", "playerId": "41a9cf80-1f8b-4cf2-a9f2-f2af6ad5a6ed", "playerInId": null}, {"id": "a55e2867-bfdd-40ad-890b-4de1299267cd", "type": "YELLOW_CARD", "value": 1, "minute": 41, "teamId": "4bde52dc-874c-4828-a3e8-eb1f6a7585b6", "playerId": "5d6c4528-574e-4961-8e9d-4b432ba70b59", "playerInId": null}, {"id": "0e6cfd52-c0fa-476b-8f7e-55377ffcd59c", "type": "GOAL", "value": 1, "minute": 59, "teamId": "7d428867-6b12-452d-861e-a519d70dedd0", "playerId": "86926ba1-a6f9-45c6-a51e-1f955c81ca2e", "playerInId": null}, {"id": "1017f531-10af-443d-aef9-cdf0efb0d75d", "type": "GOAL", "value": 1, "minute": 64, "teamId": "7d428867-6b12-452d-861e-a519d70dedd0", "playerId": "86926ba1-a6f9-45c6-a51e-1f955c81ca2e", "playerInId": null}, {"id": "93818f8e-7e95-40fa-bd6c-6b7db4a5fa80", "type": "YELLOW_CARD", "value": 1, "minute": 67, "teamId": "7d428867-6b12-452d-861e-a519d70dedd0", "playerId": "5cb78e8d-7ed3-4780-80d0-6608acad8b98", "playerInId": null}, {"id": "0bac6672-3644-481a-904b-db432c4f1dce", "type": "SUBSTITUTION", "value": 1, "minute": 70, "teamId": "7d428867-6b12-452d-861e-a519d70dedd0", "playerId": "778a3e3d-3d8c-4185-bf00-f517f088fc6f", "playerInId": "aa231e0c-a3a5-47bb-a54a-5efebae2c4d3"}, {"id": "ab7ac4b4-0be0-49b5-abb3-0ad18fdf8696", "type": "SUBSTITUTION", "value": 1, "minute": 72, "teamId": "4bde52dc-874c-4828-a3e8-eb1f6a7585b6", "playerId": "f6dcee74-5e3f-41b0-ada3-04eb7c564fb4", "playerInId": "cbf92789-ceba-440b-8293-a04cf3a44438"}, {"id": "4c59536f-66a7-4873-aedb-105cf109fa23", "type": "RED_CARD", "value": 1, "minute": 80, "teamId": "4bde52dc-874c-4828-a3e8-eb1f6a7585b6", "playerId": "384cc74e-b0ef-4dd5-a9a5-dd4c7e03f676", "playerInId": null}, {"id": "0fa38362-b36c-4e42-9123-4dde3183903f", "type": "YELLOW_CARD", "value": 1, "minute": 85, "teamId": "7d428867-6b12-452d-861e-a519d70dedd0", "playerId": "86926ba1-a6f9-45c6-a51e-1f955c81ca2e", "playerInId": null}]	2026-10-17 15:58:11.578
946b0e8d-5750-40d9-82c9-28963daa90c1	e1465a8b-d5b1-418e-abc1-9f5efba20c74	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	ab7d9b35-97b6-4e00-b17e-ab915cd51696	b8ff9a76-bd82-424a-90d3-4cecfbf65b5f	7d428867-6b12-452d-861e-a519d70dedd0	3	4	1	2026-10-17 15:58:11.889	[{"id": "a5d4980b-8f1c-4ebd-ac11-1badf7ca905f", "type": "GOAL", "value": 1, "minute": 17, "teamId": "7d428867-6b12-452d-861e-a519d70dedd0", "playerId": "e1bcf075-9d5f-47e5-a312-3161f3ebf3fe", "playerInId": null}, {"id": "64556234-3000-4979-a53c-a54b85aa1aba", "type": "GOAL", "value": 1, "minute": 21, "teamId": "7d428867-6b12-452d-861e-a519d70dedd0", "playerId": "ce7df7d4-1165-4d57-b331-fd91520ea101", "playerInId": null}, {"id": "2c345913-0d41-4be4-a9b7-81c47fc5c77c", "type": "GOAL", "value": 1, "minute": 27, "teamId": "b8ff9a76-bd82-424a-90d3-4cecfbf65b5f", "playerId": "4cb149f2-eb9c-469a-a987-9baec8d1510a", "playerInId": null}, {"id": "706467f9-de29-488d-ac36-c08237954dd6", "type": "GOAL", "value": 1, "minute": 27, "teamId": "7d428867-6b12-452d-861e-a519d70dedd0", "playerId": "4738ecef-4c60-4253-bba8-cb7236dd2965", "playerInId": null}, {"id": "79b902a2-21ed-4d8c-97d0-c936377f60d9", "type": "YELLOW_CARD", "value": 1, "minute": 32, "teamId": "b8ff9a76-bd82-424a-90d3-4cecfbf65b5f", "playerId": "269fd093-e0b6-493b-9d42-ed4d6e468ad1", "playerInId": null}, {"id": "601d7494-a74f-45dc-80f8-eb425881ed01", "type": "GOAL", "value": 1, "minute": 43, "teamId": "7d428867-6b12-452d-861e-a519d70dedd0", "playerId": "ce7df7d4-1165-4d57-b331-fd91520ea101", "playerInId": null}, {"id": "bacd928d-bec8-4f87-9110-c821c9f9d5b7", "type": "GOAL", "value": 1, "minute": 47, "teamId": "b8ff9a76-bd82-424a-90d3-4cecfbf65b5f", "playerId": "1e86b5d6-fcb9-4c2d-92f0-1c8b2cc4fcc7", "playerInId": null}, {"id": "80a01621-0409-486b-9535-c8bf281fbbfe", "type": "SUBSTITUTION", "value": 1, "minute": 57, "teamId": "7d428867-6b12-452d-861e-a519d70dedd0", "playerId": "aa231e0c-a3a5-47bb-a54a-5efebae2c4d3", "playerInId": "778a3e3d-3d8c-4185-bf00-f517f088fc6f"}, {"id": "74efcc43-799e-4818-814d-a19a8943940c", "type": "GOAL", "value": 1, "minute": 67, "teamId": "b8ff9a76-bd82-424a-90d3-4cecfbf65b5f", "playerId": "4cb149f2-eb9c-469a-a987-9baec8d1510a", "playerInId": null}, {"id": "51209bff-fac5-445c-a143-781a51648e73", "type": "SUBSTITUTION", "value": 1, "minute": 78, "teamId": "b8ff9a76-bd82-424a-90d3-4cecfbf65b5f", "playerId": "8bdc4a4d-2cc7-4ff9-9ca1-6c9ddcf68085", "playerInId": "4cb149f2-eb9c-469a-a987-9baec8d1510a"}, {"id": "eb998a6f-1f1c-48ef-987e-d65cc4d7a6f5", "type": "YELLOW_CARD", "value": 1, "minute": 83, "teamId": "7d428867-6b12-452d-861e-a519d70dedd0", "playerId": "fb4d6be8-6542-4411-ab48-0f91bcf0e83b", "playerInId": null}]	2026-10-17 15:58:11.907
aa369254-a42b-4b36-a4cd-fd3624dca403	e1465a8b-d5b1-418e-abc1-9f5efba20c74	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	ab7d9b35-97b6-4e00-b17e-ab915cd51696	ab0337ae-4666-4966-8dcf-6ee5550f3e22	32c34014-0bd9-4102-ad3a-5f84bc59a5a5	0	4	1	2026-10-17 15:58:12.32	[{"id": "f83da456-4ef4-4bdb-b9b9-7cfeae7af991", "type": "GOAL", "value": 1, "minute": 20, "teamId": "32c34014-0bd9-4102-ad3a-5f84bc59a5a5", "playerId": "7bb2df2e-cf3f-4da1-9686-43dd8e2cb409", "playerInId": null}, {"id": "c653fc87-ac5e-4970-b5e5-20e46838be21", "type": "GOAL", "value": 1, "minute": 36, "teamId": "32c34014-0bd9-4102-ad3a-5f84bc59a5a5", "playerId": "f7ef7de8-1dda-4fae-9ceb-3cee4765060e", "playerInId": null}, {"id": "8ec7aec7-7a78-4e54-8a69-15f1e48a2e54", "type": "YELLOW_CARD", "value": 1, "minute": 39, "teamId": "32c34014-0bd9-4102-ad3a-5f84bc59a5a5", "playerId": "b062519d-e5e4-4ed8-b57d-62cb1d829e54", "playerInId": null}, {"id": "b480287a-d6fb-44a5-9f5b-bc8af4a37edc", "type": "GOAL", "value": 1, "minute": 71, "teamId": "32c34014-0bd9-4102-ad3a-5f84bc59a5a5", "playerId": "f7ef7de8-1dda-4fae-9ceb-3cee4765060e", "playerInId": null}, {"id": "fc5f9522-9753-4739-bd64-b6fa9fbf653c", "type": "SUBSTITUTION", "value": 1, "minute": 73, "teamId": "32c34014-0bd9-4102-ad3a-5f84bc59a5a5", "playerId": "b2ac9fa5-7edc-44cc-be36-0b233e1e1418", "playerInId": "92b054a9-575f-4928-b646-ff6c1ed3bc9f"}, {"id": "c8e53cec-59f5-4ea7-96d9-f6b8c2a6ed80", "type": "SUBSTITUTION", "value": 1, "minute": 77, "teamId": "ab0337ae-4666-4966-8dcf-6ee5550f3e22", "playerId": "08d29d9c-a3c8-48a0-be82-59c97bb4be2d", "playerInId": "2b9e9cc7-6c1f-4b1a-950d-3946646bae19"}, {"id": "d5f71c31-c71b-46ac-ab82-c95fae5fe7a6", "type": "GOAL", "value": 1, "minute": 85, "teamId": "32c34014-0bd9-4102-ad3a-5f84bc59a5a5", "playerId": "b2ac9fa5-7edc-44cc-be36-0b233e1e1418", "playerInId": null}]	2026-10-17 15:58:12.333
4e5ba4a4-455a-45d1-aadb-ae47d00660be	e1465a8b-d5b1-418e-abc1-9f5efba20c74	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	ab7d9b35-97b6-4e00-b17e-ab915cd51696	b9547f9d-bcf3-416d-be8e-49747b939a79	7d428867-6b12-452d-861e-a519d70dedd0	1	0	1	2026-10-17 15:58:12.484	[{"id": "38339456-ff65-48be-b922-607a3aefa070", "type": "GOAL", "value": 1, "minute": 9, "teamId": "b9547f9d-bcf3-416d-be8e-49747b939a79", "playerId": "43b7d63b-4482-4954-b77a-c63d50efc242", "playerInId": null}, {"id": "5cf26cac-e04c-4d49-86d9-a035c0f8063c", "type": "YELLOW_CARD", "value": 1, "minute": 31, "teamId": "b9547f9d-bcf3-416d-be8e-49747b939a79", "playerId": "52f47a80-8889-4dad-803e-2256a066e060", "playerInId": null}, {"id": "41fe7fe6-5c50-4a28-b70a-ce5cb4e85b82", "type": "SUBSTITUTION", "value": 1, "minute": 56, "teamId": "7d428867-6b12-452d-861e-a519d70dedd0", "playerId": "ce7df7d4-1165-4d57-b331-fd91520ea101", "playerInId": "778a3e3d-3d8c-4185-bf00-f517f088fc6f"}, {"id": "45a782f3-ac69-4fe5-8537-6e9e008c6eff", "type": "SUBSTITUTION", "value": 1, "minute": 72, "teamId": "b9547f9d-bcf3-416d-be8e-49747b939a79", "playerId": "885f2113-15c5-41d9-a41e-99b83e867eae", "playerInId": "9d72f898-848d-487f-ae0f-eb9ed02c7a0f"}]	2026-10-17 15:58:12.5
17d59921-c355-40cb-95b6-afd38c212124	e1465a8b-d5b1-418e-abc1-9f5efba20c74	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	ab7d9b35-97b6-4e00-b17e-ab915cd51696	ab0337ae-4666-4966-8dcf-6ee5550f3e22	b8ff9a76-bd82-424a-90d3-4cecfbf65b5f	0	1	1	2026-10-17 15:58:12.666	[{"id": "09786e6f-e257-4f45-8c3c-8f48ba0b45ba", "type": "GOAL", "value": 1, "minute": 24, "teamId": "b8ff9a76-bd82-424a-90d3-4cecfbf65b5f", "playerId": "601ee585-515b-41a9-9ae8-1a7c534fad42", "playerInId": null}, {"id": "8f50a2cf-591a-43fd-a624-11654f77ff4e", "type": "YELLOW_CARD", "value": 1, "minute": 69, "teamId": "ab0337ae-4666-4966-8dcf-6ee5550f3e22", "playerId": "ad540c56-bbf7-43e9-bcc5-1cb1a77cee0d", "playerInId": null}, {"id": "e4c7e8f8-a17d-4c27-b420-812c287b6c0d", "type": "SUBSTITUTION", "value": 1, "minute": 71, "teamId": "b8ff9a76-bd82-424a-90d3-4cecfbf65b5f", "playerId": "1e86b5d6-fcb9-4c2d-92f0-1c8b2cc4fcc7", "playerInId": "2c5dbb22-8c7d-4028-a086-9960429e5872"}, {"id": "a9b07454-e0ba-4390-a72e-af8f8d580bbd", "type": "SUBSTITUTION", "value": 1, "minute": 72, "teamId": "ab0337ae-4666-4966-8dcf-6ee5550f3e22", "playerId": "6096c91a-22c9-4f4a-9be1-913ee4e36c0b", "playerInId": "844a5e7f-12de-4cd4-8bf1-d5d9c2354b41"}]	2026-10-17 15:58:12.694
85e59089-be9a-4c45-9600-85a287009a56	e1465a8b-d5b1-418e-abc1-9f5efba20c74	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	ab7d9b35-97b6-4e00-b17e-ab915cd51696	4bde52dc-874c-4828-a3e8-eb1f6a7585b6	32c34014-0bd9-4102-ad3a-5f84bc59a5a5	2	0	1	2026-10-17 15:58:12.872	[{"id": "ff505cb5-b4d6-458a-9fd8-90a920575c50", "type": "GOAL", "value": 1, "minute": 33, "teamId": "4bde52dc-874c-4828-a3e8-eb1f6a7585b6", "playerId": "aa347f47-fd15-4057-b372-341bf315ac60", "playerInId": null}, {"id": "2eda39e8-d814-487a-b131-be96391ab1e1", "type": "SUBSTITUTION", "value": 1, "minute": 60, "teamId": "32c34014-0bd9-4102-ad3a-5f84bc59a5a5", "playerId": "f7ef7de8-1dda-4fae-9ceb-3cee4765060e", "playerInId": "7bb2df2e-cf3f-4da1-9686-43dd8e2cb409"}, {"id": "2a83caed-26b8-439a-b814-cb38e5e91206", "type": "GOAL", "value": 1, "minute": 63, "teamId": "4bde52dc-874c-4828-a3e8-eb1f6a7585b6", "playerId": "aa347f47-fd15-4057-b372-341bf315ac60", "playerInId": null}, {"id": "332baac2-0063-41f4-8343-f0849fa7ddca", "type": "SUBSTITUTION", "value": 1, "minute": 80, "teamId": "4bde52dc-874c-4828-a3e8-eb1f6a7585b6", "playerId": "7449a5c8-e7b3-4bef-8443-366909536aeb", "playerInId": "cbf92789-ceba-440b-8293-a04cf3a44438"}, {"id": "ab1eca01-00bb-416f-8ae8-7d16c0a12011", "type": "YELLOW_CARD", "value": 1, "minute": 81, "teamId": "4bde52dc-874c-4828-a3e8-eb1f6a7585b6", "playerId": "cbf92789-ceba-440b-8293-a04cf3a44438", "playerInId": null}]	2026-10-17 15:58:12.891
58dd0ad4-afde-46cf-b2dd-b658a64cea8a	e1465a8b-d5b1-418e-abc1-9f5efba20c74	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	ab7d9b35-97b6-4e00-b17e-ab915cd51696	b9547f9d-bcf3-416d-be8e-49747b939a79	4bde52dc-874c-4828-a3e8-eb1f6a7585b6	1	0	1	2026-10-17 15:58:12.079	[{"id": "67b8855b-7859-4892-8560-46fcabcec2b4", "type": "YELLOW_CARD", "value": 1, "minute": 27, "teamId": "4bde52dc-874c-4828-a3e8-eb1f6a7585b6", "playerId": "8505e4f8-41de-4c73-b55a-47b81fbc594f", "playerInId": null}, {"id": "c8eabea7-df05-4b51-a3ad-02599136c774", "type": "SUBSTITUTION", "value": 1, "minute": 64, "teamId": "b9547f9d-bcf3-416d-be8e-49747b939a79", "playerId": "52f47a80-8889-4dad-803e-2256a066e060", "playerInId": "48441d20-0dfa-4453-bb78-6dd42ca6c47c"}, {"id": "330201e9-fefd-4630-a55a-60dd5b141d6d", "type": "SUBSTITUTION", "value": 1, "minute": 65, "teamId": "4bde52dc-874c-4828-a3e8-eb1f6a7585b6", "playerId": "01184fb7-e226-4467-9ac7-8a19e0d45d06", "playerInId": "77b42736-a8d7-4c82-b0c2-db9e2f19cef2"}, {"id": "0a371d6d-c0d5-4e21-88df-46ed25e22950", "type": "GOAL", "value": 1, "minute": 86, "teamId": "b9547f9d-bcf3-416d-be8e-49747b939a79", "playerId": "979e5cad-d17d-4ef6-95b6-390786de3a84", "playerInId": null}]	2026-10-17 15:58:12.099
5949d616-faf0-4dc8-a3d0-22f773454225	e1465a8b-d5b1-418e-abc1-9f5efba20c74	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	ab7d9b35-97b6-4e00-b17e-ab915cd51696	32c34014-0bd9-4102-ad3a-5f84bc59a5a5	7d428867-6b12-452d-861e-a519d70dedd0	1	0	1	2026-10-17 15:58:13.488	[{"id": "563aad33-00e6-430c-be08-bb06e5278586", "type": "GOAL", "value": 1, "minute": 15, "teamId": "32c34014-0bd9-4102-ad3a-5f84bc59a5a5", "playerId": "741aea41-b62a-4bd7-8832-815295dcc985", "playerInId": null}, {"id": "44f892c7-9466-4de4-af3b-41145af72792", "type": "YELLOW_CARD", "value": 1, "minute": 23, "teamId": "32c34014-0bd9-4102-ad3a-5f84bc59a5a5", "playerId": "b2ac9fa5-7edc-44cc-be36-0b233e1e1418", "playerInId": null}, {"id": "96c922e4-cf3f-454d-a74d-29d609ec33c6", "type": "SUBSTITUTION", "value": 1, "minute": 64, "teamId": "7d428867-6b12-452d-861e-a519d70dedd0", "playerId": "778a3e3d-3d8c-4185-bf00-f517f088fc6f", "playerInId": "aa231e0c-a3a5-47bb-a54a-5efebae2c4d3"}, {"id": "b605d55e-c9c9-4976-ae16-eacd966fb340", "type": "SUBSTITUTION", "value": 1, "minute": 73, "teamId": "32c34014-0bd9-4102-ad3a-5f84bc59a5a5", "playerId": "160028e8-4b07-4661-ba51-98892b016375", "playerInId": "bd7cd450-c692-4ead-848e-c4b70650099f"}]	2026-10-17 15:58:13.504
dcae3a01-e4b1-4b24-a590-52c23e701038	e1465a8b-d5b1-418e-abc1-9f5efba20c74	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	ab7d9b35-97b6-4e00-b17e-ab915cd51696	4bde52dc-874c-4828-a3e8-eb1f6a7585b6	ab0337ae-4666-4966-8dcf-6ee5550f3e22	1	1	1	2026-10-17 15:58:13.771	[{"id": "71630a27-0905-4b5e-a412-145b64695f45", "type": "GOAL", "value": 1, "minute": 22, "teamId": "ab0337ae-4666-4966-8dcf-6ee5550f3e22", "playerId": "755bc1d8-3166-4263-b896-8ee6a6a56be0", "playerInId": null}, {"id": "c69d39ac-89ba-41f2-a965-e1b57c6f43a7", "type": "YELLOW_CARD", "value": 1, "minute": 28, "teamId": "4bde52dc-874c-4828-a3e8-eb1f6a7585b6", "playerId": "8505e4f8-41de-4c73-b55a-47b81fbc594f", "playerInId": null}, {"id": "32cc49ad-257d-4d9c-b93b-062e8c6ad8bc", "type": "SUBSTITUTION", "value": 1, "minute": 65, "teamId": "ab0337ae-4666-4966-8dcf-6ee5550f3e22", "playerId": "2b9e9cc7-6c1f-4b1a-950d-3946646bae19", "playerInId": "08d29d9c-a3c8-48a0-be82-59c97bb4be2d"}, {"id": "ac5330ae-92e1-4915-9306-ae1ae0d9adb4", "type": "SUBSTITUTION", "value": 1, "minute": 66, "teamId": "4bde52dc-874c-4828-a3e8-eb1f6a7585b6", "playerId": "7449a5c8-e7b3-4bef-8443-366909536aeb", "playerInId": "cbf92789-ceba-440b-8293-a04cf3a44438"}, {"id": "75083e6b-8053-4edb-a2a4-5ad9ed393430", "type": "GOAL", "value": 1, "minute": 77, "teamId": "4bde52dc-874c-4828-a3e8-eb1f6a7585b6", "playerId": "aa347f47-fd15-4057-b372-341bf315ac60", "playerInId": null}]	2026-10-17 15:58:13.799
9a8499dd-8f31-4e13-80f8-a835ff60c70f	e1465a8b-d5b1-418e-abc1-9f5efba20c74	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	ab7d9b35-97b6-4e00-b17e-ab915cd51696	b9547f9d-bcf3-416d-be8e-49747b939a79	32c34014-0bd9-4102-ad3a-5f84bc59a5a5	3	1	1	2026-10-17 15:58:14.17	[{"id": "ae8cc1f4-eca3-4ab3-b055-bec6e51b273b", "type": "GOAL", "value": 1, "minute": 5, "teamId": "b9547f9d-bcf3-416d-be8e-49747b939a79", "playerId": "bfa3606e-f2f2-48d5-94c4-f3c0bb3c8cd6", "playerInId": null}, {"id": "81d63698-6d1e-4b6f-8cdb-7afdf7e1c830", "type": "GOAL", "value": 1, "minute": 49, "teamId": "32c34014-0bd9-4102-ad3a-5f84bc59a5a5", "playerId": "3824aa99-5cdc-40e3-91a3-a8a71b9c6e8e", "playerInId": null}, {"id": "ae66afc1-421e-4322-b82f-fe7dd15168be", "type": "YELLOW_CARD", "value": 1, "minute": 49, "teamId": "32c34014-0bd9-4102-ad3a-5f84bc59a5a5", "playerId": "f7ef7de8-1dda-4fae-9ceb-3cee4765060e", "playerInId": null}, {"id": "6fe20606-ef95-48c3-b2eb-dbc7f9036b05", "type": "SUBSTITUTION", "value": 1, "minute": 56, "teamId": "32c34014-0bd9-4102-ad3a-5f84bc59a5a5", "playerId": "f7ef7de8-1dda-4fae-9ceb-3cee4765060e", "playerInId": "7bb2df2e-cf3f-4da1-9686-43dd8e2cb409"}, {"id": "c4546dc3-c14d-4a4f-b457-781378edfc39", "type": "SUBSTITUTION", "value": 1, "minute": 73, "teamId": "b9547f9d-bcf3-416d-be8e-49747b939a79", "playerId": "08438700-0dc6-4e7e-ac68-e1636ce9c7c9", "playerInId": "9d72f898-848d-487f-ae0f-eb9ed02c7a0f"}, {"id": "7cf64280-01c1-454d-af38-4b145087c184", "type": "GOAL", "value": 1, "minute": 83, "teamId": "b9547f9d-bcf3-416d-be8e-49747b939a79", "playerId": "979e5cad-d17d-4ef6-95b6-390786de3a84", "playerInId": null}, {"id": "7676893e-8c62-48ac-a177-bda9939b575e", "type": "GOAL", "value": 1, "minute": 83, "teamId": "b9547f9d-bcf3-416d-be8e-49747b939a79", "playerId": "e6bf9b81-f443-43ad-8c6c-17458c46a101", "playerInId": null}, {"id": "4acf0f30-ba9d-414f-8af8-b6f065368ca6", "type": "YELLOW_CARD", "value": 1, "minute": 84, "teamId": "b9547f9d-bcf3-416d-be8e-49747b939a79", "playerId": "9d72f898-848d-487f-ae0f-eb9ed02c7a0f", "playerInId": null}]	2026-10-17 15:58:14.199
ff95bca3-f823-4026-8c6f-3c94990de590	e1465a8b-d5b1-418e-abc1-9f5efba20c74	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	ab7d9b35-97b6-4e00-b17e-ab915cd51696	b9547f9d-bcf3-416d-be8e-49747b939a79	ab0337ae-4666-4966-8dcf-6ee5550f3e22	1	1	1	2026-10-17 15:58:15.485	[{"id": "b321d937-e746-46b6-b5b0-41291d481f29", "type": "YELLOW_CARD", "value": 1, "minute": 10, "teamId": "b9547f9d-bcf3-416d-be8e-49747b939a79", "playerId": "e6bf9b81-f443-43ad-8c6c-17458c46a101", "playerInId": null}, {"id": "50e359a9-698c-48f6-8936-8e6806be444f", "type": "YELLOW_CARD", "value": 1, "minute": 43, "teamId": "ab0337ae-4666-4966-8dcf-6ee5550f3e22", "playerId": "ad540c56-bbf7-43e9-bcc5-1cb1a77cee0d", "playerInId": null}, {"id": "ff1472ed-863f-4864-86c6-772c3cbb229c", "type": "GOAL", "value": 1, "minute": 51, "teamId": "ab0337ae-4666-4966-8dcf-6ee5550f3e22", "playerId": "755bc1d8-3166-4263-b896-8ee6a6a56be0", "playerInId": null}, {"id": "152f0276-24aa-4c68-a4ef-34708b3971cd", "type": "GOAL", "value": 1, "minute": 55, "teamId": "b9547f9d-bcf3-416d-be8e-49747b939a79", "playerId": "48441d20-0dfa-4453-bb78-6dd42ca6c47c", "playerInId": null}, {"id": "314ceac3-a04c-48e7-af9d-713609912ae6", "type": "SUBSTITUTION", "value": 1, "minute": 55, "teamId": "b9547f9d-bcf3-416d-be8e-49747b939a79", "playerId": "e6bf9b81-f443-43ad-8c6c-17458c46a101", "playerInId": "48441d20-0dfa-4453-bb78-6dd42ca6c47c"}, {"id": "ea84b609-b30a-440a-83a8-b05ae8e9709f", "type": "SUBSTITUTION", "value": 1, "minute": 77, "teamId": "ab0337ae-4666-4966-8dcf-6ee5550f3e22", "playerId": "755bc1d8-3166-4263-b896-8ee6a6a56be0", "playerInId": "ad540c56-bbf7-43e9-bcc5-1cb1a77cee0d"}]	2026-10-17 15:58:15.502
164d663d-0e19-447b-9ac7-66262a7cdc5a	e1465a8b-d5b1-418e-abc1-9f5efba20c74	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	ab7d9b35-97b6-4e00-b17e-ab915cd51696	b8ff9a76-bd82-424a-90d3-4cecfbf65b5f	b9547f9d-bcf3-416d-be8e-49747b939a79	3	4	1	2026-10-17 15:58:13.282	[{"id": "199a48af-8ff3-4ace-99b3-cadec1b9972b", "type": "GOAL", "value": 1, "minute": 5, "teamId": "b9547f9d-bcf3-416d-be8e-49747b939a79", "playerId": "48441d20-0dfa-4453-bb78-6dd42ca6c47c", "playerInId": null}, {"id": "d898561f-b382-4b7e-9055-0ec4f926907a", "type": "GOAL", "value": 1, "minute": 18, "teamId": "b9547f9d-bcf3-416d-be8e-49747b939a79", "playerId": "bfa3606e-f2f2-48d5-94c4-f3c0bb3c8cd6", "playerInId": null}, {"id": "bf36c9cd-d40a-4d54-843d-392f80f2c7c2", "type": "GOAL", "value": 1, "minute": 20, "teamId": "b9547f9d-bcf3-416d-be8e-49747b939a79", "playerId": "bfa3606e-f2f2-48d5-94c4-f3c0bb3c8cd6", "playerInId": null}, {"id": "a06e149d-4791-42ce-b7bf-d8a53fc0ef30", "type": "GOAL", "value": 1, "minute": 25, "teamId": "b8ff9a76-bd82-424a-90d3-4cecfbf65b5f", "playerId": "4cb149f2-eb9c-469a-a987-9baec8d1510a", "playerInId": null}, {"id": "208a3b02-4358-4f84-8a93-5977d54ae217", "type": "GOAL", "value": 1, "minute": 33, "teamId": "b8ff9a76-bd82-424a-90d3-4cecfbf65b5f", "playerId": "601ee585-515b-41a9-9ae8-1a7c534fad42", "playerInId": null}, {"id": "7d353f74-1ec9-4a1a-b327-3a17d76bb03e", "type": "GOAL", "value": 1, "minute": 35, "teamId": "b9547f9d-bcf3-416d-be8e-49747b939a79", "playerId": "48441d20-0dfa-4453-bb78-6dd42ca6c47c", "playerInId": null}, {"id": "3e775cd2-4423-4e6e-aa79-d2b3c3de4849", "type": "SUBSTITUTION", "value": 1, "minute": 56, "teamId": "b9547f9d-bcf3-416d-be8e-49747b939a79", "playerId": "e6bf9b81-f443-43ad-8c6c-17458c46a101", "playerInId": "48441d20-0dfa-4453-bb78-6dd42ca6c47c"}, {"id": "10bd16e7-a1c7-41d5-b432-8a866fe797de", "type": "SUBSTITUTION", "value": 1, "minute": 62, "teamId": "b8ff9a76-bd82-424a-90d3-4cecfbf65b5f", "playerId": "601ee585-515b-41a9-9ae8-1a7c534fad42", "playerInId": "2c5dbb22-8c7d-4028-a086-9960429e5872"}, {"id": "a98ff684-b605-4b54-a287-3d0ac4c33a98", "type": "YELLOW_CARD", "value": 1, "minute": 66, "teamId": "b8ff9a76-bd82-424a-90d3-4cecfbf65b5f", "playerId": "e16d9440-7c44-4d4a-8220-b3170fa5826e", "playerInId": null}, {"id": "8d8f22f2-87c9-409e-a995-de0042b167fb", "type": "GOAL", "value": 1, "minute": 84, "teamId": "b8ff9a76-bd82-424a-90d3-4cecfbf65b5f", "playerId": "7adbf640-933e-4c30-ba3c-69f3ee8fa78c", "playerInId": null}, {"id": "84b872bb-925b-4fe7-986b-14bf2643a5b5", "type": "YELLOW_CARD", "value": 1, "minute": 85, "teamId": "b8ff9a76-bd82-424a-90d3-4cecfbf65b5f", "playerId": "8eada780-c616-453f-b1da-d37878f417a1", "playerInId": null}]	2026-10-17 15:58:13.303
c5cbce55-1e3b-4300-b1b5-1255903f5a20	e1465a8b-d5b1-418e-abc1-9f5efba20c74	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	ab7d9b35-97b6-4e00-b17e-ab915cd51696	4bde52dc-874c-4828-a3e8-eb1f6a7585b6	b8ff9a76-bd82-424a-90d3-4cecfbf65b5f	0	1	1	2026-10-17 15:58:14.511	[{"id": "49cab54f-f97b-4e1c-919a-0d0a5e189efe", "type": "YELLOW_CARD", "value": 1, "minute": 12, "teamId": "b8ff9a76-bd82-424a-90d3-4cecfbf65b5f", "playerId": "7adbf640-933e-4c30-ba3c-69f3ee8fa78c", "playerInId": null}, {"id": "e8b063a0-b7fd-4991-a124-4d3b965e3e4b", "type": "GOAL", "value": 1, "minute": 21, "teamId": "b8ff9a76-bd82-424a-90d3-4cecfbf65b5f", "playerId": "601ee585-515b-41a9-9ae8-1a7c534fad42", "playerInId": null}, {"id": "6cdd63a7-43ea-4a8e-9d0d-cd99e56a9d94", "type": "YELLOW_CARD", "value": 1, "minute": 40, "teamId": "b8ff9a76-bd82-424a-90d3-4cecfbf65b5f", "playerId": "4cb149f2-eb9c-469a-a987-9baec8d1510a", "playerInId": null}, {"id": "4ffaaad6-b5cd-49d0-b49e-de400fe8481d", "type": "SUBSTITUTION", "value": 1, "minute": 72, "teamId": "b8ff9a76-bd82-424a-90d3-4cecfbf65b5f", "playerId": "4cb149f2-eb9c-469a-a987-9baec8d1510a", "playerInId": "8bdc4a4d-2cc7-4ff9-9ca1-6c9ddcf68085"}, {"id": "76553a25-915c-43bd-8dfd-5fa2d37fc892", "type": "SUBSTITUTION", "value": 1, "minute": 80, "teamId": "4bde52dc-874c-4828-a3e8-eb1f6a7585b6", "playerId": "aa347f47-fd15-4057-b372-341bf315ac60", "playerInId": "cbf92789-ceba-440b-8293-a04cf3a44438"}]	2026-10-17 15:58:14.538
904e9388-81db-443f-87f6-3e3a39ea27f9	e1465a8b-d5b1-418e-abc1-9f5efba20c74	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	ab7d9b35-97b6-4e00-b17e-ab915cd51696	ab0337ae-4666-4966-8dcf-6ee5550f3e22	7d428867-6b12-452d-861e-a519d70dedd0	2	1	1	2026-10-17 15:58:14.875	[{"id": "a5a388be-8930-4131-86c9-e575b4901e49", "type": "GOAL", "value": 1, "minute": 20, "teamId": "7d428867-6b12-452d-861e-a519d70dedd0", "playerId": "4738ecef-4c60-4253-bba8-cb7236dd2965", "playerInId": null}, {"id": "594584d4-0680-406c-af68-c75601713572", "type": "YELLOW_CARD", "value": 1, "minute": 27, "teamId": "ab0337ae-4666-4966-8dcf-6ee5550f3e22", "playerId": "08d29d9c-a3c8-48a0-be82-59c97bb4be2d", "playerInId": null}, {"id": "4a14dd5a-7111-48a9-a7c0-19f93927e0c1", "type": "YELLOW_CARD", "value": 1, "minute": 48, "teamId": "7d428867-6b12-452d-861e-a519d70dedd0", "playerId": "ce7df7d4-1165-4d57-b331-fd91520ea101", "playerInId": null}, {"id": "c718ca2c-481d-4c76-9124-fc034e2a70a5", "type": "YELLOW_CARD", "value": 1, "minute": 55, "teamId": "ab0337ae-4666-4966-8dcf-6ee5550f3e22", "playerId": "6096c91a-22c9-4f4a-9be1-913ee4e36c0b", "playerInId": null}, {"id": "bde2634d-291f-4463-bcbf-f586a30ddbd0", "type": "GOAL", "value": 1, "minute": 56, "teamId": "ab0337ae-4666-4966-8dcf-6ee5550f3e22", "playerId": "844a5e7f-12de-4cd4-8bf1-d5d9c2354b41", "playerInId": null}, {"id": "20e29304-41fc-47a4-b2f2-3b6de8fe5b5e", "type": "SUBSTITUTION", "value": 1, "minute": 60, "teamId": "ab0337ae-4666-4966-8dcf-6ee5550f3e22", "playerId": "6096c91a-22c9-4f4a-9be1-913ee4e36c0b", "playerInId": "844a5e7f-12de-4cd4-8bf1-d5d9c2354b41"}, {"id": "614d8f14-0a02-411a-92d9-a7b86b5f1b1e", "type": "GOAL", "value": 1, "minute": 76, "teamId": "ab0337ae-4666-4966-8dcf-6ee5550f3e22", "playerId": "755bc1d8-3166-4263-b896-8ee6a6a56be0", "playerInId": null}, {"id": "c33efe52-4241-46ad-bf8a-2cdc1a83d2b9", "type": "SUBSTITUTION", "value": 1, "minute": 79, "teamId": "7d428867-6b12-452d-861e-a519d70dedd0", "playerId": "aa231e0c-a3a5-47bb-a54a-5efebae2c4d3", "playerInId": "778a3e3d-3d8c-4185-bf00-f517f088fc6f"}]	2026-10-17 15:58:14.898
f3caf4be-b9a0-4011-bd67-60aa8d81bcd5	e1465a8b-d5b1-418e-abc1-9f5efba20c74	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	ab7d9b35-97b6-4e00-b17e-ab915cd51696	b8ff9a76-bd82-424a-90d3-4cecfbf65b5f	32c34014-0bd9-4102-ad3a-5f84bc59a5a5	2	1	1	2026-10-17 15:58:15.212	[{"id": "4a7ef6ba-98b9-4168-a658-b195585aaf3d", "type": "GOAL", "value": 1, "minute": 37, "teamId": "b8ff9a76-bd82-424a-90d3-4cecfbf65b5f", "playerId": "2c5dbb22-8c7d-4028-a086-9960429e5872", "playerInId": null}, {"id": "bbe8f4ea-7028-4127-8a4e-a79346498dc9", "type": "GOAL", "value": 1, "minute": 47, "teamId": "b8ff9a76-bd82-424a-90d3-4cecfbf65b5f", "playerId": "1e86b5d6-fcb9-4c2d-92f0-1c8b2cc4fcc7", "playerInId": null}, {"id": "8926e1ed-8267-42ab-bb66-f76de95c0181", "type": "SUBSTITUTION", "value": 1, "minute": 59, "teamId": "b8ff9a76-bd82-424a-90d3-4cecfbf65b5f", "playerId": "be9c0186-5e1e-419b-9742-d8ba505cb888", "playerInId": "e16d9440-7c44-4d4a-8220-b3170fa5826e"}, {"id": "cd54bcf9-75b4-4d65-84af-a88a950e43e5", "type": "GOAL", "value": 1, "minute": 59, "teamId": "32c34014-0bd9-4102-ad3a-5f84bc59a5a5", "playerId": "f7ef7de8-1dda-4fae-9ceb-3cee4765060e", "playerInId": null}, {"id": "bf86cf22-b94f-433c-aab6-51b0ebfe3249", "type": "SUBSTITUTION", "value": 1, "minute": 60, "teamId": "32c34014-0bd9-4102-ad3a-5f84bc59a5a5", "playerId": "bd7cd450-c692-4ead-848e-c4b70650099f", "playerInId": "b062519d-e5e4-4ed8-b57d-62cb1d829e54"}, {"id": "4aa5aa27-64f6-483d-82c9-34f04016786f", "type": "YELLOW_CARD", "value": 1, "minute": 64, "teamId": "32c34014-0bd9-4102-ad3a-5f84bc59a5a5", "playerId": "72db8247-2b5a-44d6-ae9e-4aae7f98c210", "playerInId": null}]	2026-10-17 15:58:15.232
\.


--
-- Data for Name: standings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.standings (id, season_id, category_id, team_id, "position", played, wins, draws, losses, goals_for, goals_against, goal_difference, points, form, updated_at) FROM stdin;
ae0ebb78-cdae-480b-889b-2631df7baf0c	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	b9547f9d-bcf3-416d-be8e-49747b939a79	1	7	5	1	1	15	10	5	16	{E,G,G,G,G}	2026-10-17 15:58:15.522
51df4f4e-b0cf-450d-b6b7-3f8c5280c244	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	b8ff9a76-bd82-424a-90d3-4cecfbf65b5f	2	7	4	1	2	14	10	4	13	{G,G,P,G,P}	2026-10-17 15:58:15.522
85722edc-d7f2-40d4-b291-acabee6ff37d	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	7d428867-6b12-452d-861e-a519d70dedd0	3	6	3	0	3	8	7	1	9	{P,P,P,G,G}	2026-10-17 15:58:15.522
214d5263-956e-49f8-a055-1c3f2a83b912	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	32c34014-0bd9-4102-ad3a-5f84bc59a5a5	4	7	3	0	4	12	12	0	9	{P,P,G,P,G}	2026-10-17 15:58:15.522
597d4a05-0672-4e33-aadf-ed3ee4db640e	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	4bde52dc-874c-4828-a3e8-eb1f6a7585b6	5	6	1	2	3	3	5	-2	5	{P,E,G,P,P}	2026-10-17 15:58:15.522
c9e306d8-722f-45fa-a9a1-845cd499f435	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	ab0337ae-4666-4966-8dcf-6ee5550f3e22	6	7	1	2	4	5	13	-8	5	{E,G,E,P,P}	2026-10-17 15:58:15.522
\.


--
-- Data for Name: top_scorers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.top_scorers (id, season_id, category_id, player_id, team_id, goals) FROM stdin;
d9a69be0-5747-4c64-846a-b182c7103e0e	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	48441d20-0dfa-4453-bb78-6dd42ca6c47c	b9547f9d-bcf3-416d-be8e-49747b939a79	5
61176973-e157-4a61-b2b1-6ed935db1d5b	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	f7ef7de8-1dda-4fae-9ceb-3cee4765060e	32c34014-0bd9-4102-ad3a-5f84bc59a5a5	5
19b2726b-0dd8-4edb-83cd-51a6a2e13a2d	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	4cb149f2-eb9c-469a-a987-9baec8d1510a	b8ff9a76-bd82-424a-90d3-4cecfbf65b5f	4
fada0779-0306-4e5b-a306-4cb653dce19c	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	979e5cad-d17d-4ef6-95b6-390786de3a84	b9547f9d-bcf3-416d-be8e-49747b939a79	4
bd874a62-6780-4b45-b667-886fb168e97e	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	601ee585-515b-41a9-9ae8-1a7c534fad42	b8ff9a76-bd82-424a-90d3-4cecfbf65b5f	3
bb4ba1bf-6263-4fbb-b774-5cf6407bc38b	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	755bc1d8-3166-4263-b896-8ee6a6a56be0	ab0337ae-4666-4966-8dcf-6ee5550f3e22	3
84bdf563-d437-4155-a536-a69b3e2d1d87	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	7adbf640-933e-4c30-ba3c-69f3ee8fa78c	b8ff9a76-bd82-424a-90d3-4cecfbf65b5f	3
aa98d0fb-278a-4100-be5c-e01ae512178d	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	86926ba1-a6f9-45c6-a51e-1f955c81ca2e	7d428867-6b12-452d-861e-a519d70dedd0	3
f8b478eb-bead-47b0-a1c4-815a8ac71dc0	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	aa347f47-fd15-4057-b372-341bf315ac60	4bde52dc-874c-4828-a3e8-eb1f6a7585b6	3
068a7c8b-28bb-4a13-9256-6375983b22b5	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	bfa3606e-f2f2-48d5-94c4-f3c0bb3c8cd6	b9547f9d-bcf3-416d-be8e-49747b939a79	3
6262db09-c2cc-4a88-b563-c1bc0cba91b0	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	1e86b5d6-fcb9-4c2d-92f0-1c8b2cc4fcc7	b8ff9a76-bd82-424a-90d3-4cecfbf65b5f	2
3b740e90-07b2-4ec2-8a2f-548963b8444d	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	2c5dbb22-8c7d-4028-a086-9960429e5872	b8ff9a76-bd82-424a-90d3-4cecfbf65b5f	2
20e45073-df9f-47b3-9a9a-e755849673a0	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	4738ecef-4c60-4253-bba8-cb7236dd2965	7d428867-6b12-452d-861e-a519d70dedd0	2
d97ea8e2-0222-4e5c-ab8c-b75a23cf7a8b	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	7bb2df2e-cf3f-4da1-9686-43dd8e2cb409	32c34014-0bd9-4102-ad3a-5f84bc59a5a5	2
b785e3e8-09ca-4f54-92b4-2f6e6351b8e5	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	92b054a9-575f-4928-b646-ff6c1ed3bc9f	32c34014-0bd9-4102-ad3a-5f84bc59a5a5	2
931dbe5d-af20-4141-952f-a16463a7d956	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	ce7df7d4-1165-4d57-b331-fd91520ea101	7d428867-6b12-452d-861e-a519d70dedd0	2
3dedce0d-8f19-4e1b-9e4d-38777fe58ef0	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	e6bf9b81-f443-43ad-8c6c-17458c46a101	b9547f9d-bcf3-416d-be8e-49747b939a79	2
8e7d939e-f460-4c65-b16d-76e4f48c3df9	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	3824aa99-5cdc-40e3-91a3-a8a71b9c6e8e	32c34014-0bd9-4102-ad3a-5f84bc59a5a5	1
3bfee411-c6e8-449c-bec8-cae087bfd841	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	43b7d63b-4482-4954-b77a-c63d50efc242	b9547f9d-bcf3-416d-be8e-49747b939a79	1
603107b4-a942-4c90-be52-00bdae7814dc	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	741aea41-b62a-4bd7-8832-815295dcc985	32c34014-0bd9-4102-ad3a-5f84bc59a5a5	1
e98310e1-9c22-452c-9903-3b3fbc21207a	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	844a5e7f-12de-4cd4-8bf1-d5d9c2354b41	ab0337ae-4666-4966-8dcf-6ee5550f3e22	1
9a2b108e-8458-40b5-93c3-1e185dda6e36	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	8d26ec30-f63a-47e9-946f-ef274c5a23b7	ab0337ae-4666-4966-8dcf-6ee5550f3e22	1
d4f645ec-439c-4cbf-af95-796ad735cf8e	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	b2ac9fa5-7edc-44cc-be36-0b233e1e1418	32c34014-0bd9-4102-ad3a-5f84bc59a5a5	1
310100a1-4837-47f2-8dff-5966c103e27a	e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf	719a94f9-95a7-43d3-ba07-2f907d87c038	e1bcf075-9d5f-47e5-a312-3161f3ebf3fe	7d428867-6b12-452d-861e-a519d70dedd0	1
\.


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

\unrestrict DwHtNdMjP0UGHTRDWGmFGuQfBQkRTQTEkPLkH7eqH5IThdL7kBkf7o9K2KI11Pq

