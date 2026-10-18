--
-- PostgreSQL database dump
--

\restrict EMOIxKGdzbeUDseUvJYSepe5I6nm3wBtXsDZ7DaufK4jL8LFryLiU1BLHffRqfG

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

DROP INDEX IF EXISTS public.subscriptions_user_id_league_id_key;
DROP INDEX IF EXISTS public.subscriptions_league_id_idx;
DROP INDEX IF EXISTS public.push_subscriptions_user_id_idx;
DROP INDEX IF EXISTS public.push_subscriptions_endpoint_key;
DROP INDEX IF EXISTS public.notifications_user_id_idx;
DROP INDEX IF EXISTS public.notifications_role_idx;
DROP INDEX IF EXISTS public.notifications_email_idx;
DROP INDEX IF EXISTS public.notifications_dedupe_key_key;
DROP INDEX IF EXISTS public.deliveries_created_at_idx;
ALTER TABLE IF EXISTS ONLY public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_pkey;
ALTER TABLE IF EXISTS ONLY public.push_subscriptions DROP CONSTRAINT IF EXISTS push_subscriptions_pkey;
ALTER TABLE IF EXISTS ONLY public.preferences DROP CONSTRAINT IF EXISTS preferences_pkey;
ALTER TABLE IF EXISTS ONLY public.notifications DROP CONSTRAINT IF EXISTS notifications_pkey;
ALTER TABLE IF EXISTS ONLY public.deliveries DROP CONSTRAINT IF EXISTS deliveries_pkey;
ALTER TABLE IF EXISTS ONLY public._prisma_migrations DROP CONSTRAINT IF EXISTS _prisma_migrations_pkey;
DROP TABLE IF EXISTS public.subscriptions;
DROP TABLE IF EXISTS public.push_subscriptions;
DROP TABLE IF EXISTS public.preferences;
DROP TABLE IF EXISTS public.notifications;
DROP TABLE IF EXISTS public.deliveries;
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
-- Name: deliveries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.deliveries (
    id uuid NOT NULL,
    channel text NOT NULL,
    recipient text NOT NULL,
    subject text NOT NULL,
    status text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid NOT NULL,
    user_id uuid,
    email text,
    role text,
    type text NOT NULL,
    title text NOT NULL,
    body text NOT NULL,
    link text,
    read boolean DEFAULT false NOT NULL,
    event_id text NOT NULL,
    dedupe_key text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.preferences (
    user_id uuid NOT NULL,
    email_enabled boolean DEFAULT true NOT NULL,
    push_enabled boolean DEFAULT true NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: push_subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.push_subscriptions (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    endpoint text NOT NULL,
    p256dh text NOT NULL,
    auth text NOT NULL,
    user_agent text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscriptions (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    email text NOT NULL,
    league_id uuid NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
fe430df1-a890-490d-9249-70c9cc2a8092	28d690da2c272f7cca051277508053be31563ef60a1ae8b1a16b26f948b1b4e7	2026-10-18 04:56:27.779862+00	20261011000000_init	\N	\N	2026-10-18 04:56:27.587665+00	1
63488bac-efbf-4820-935d-d3dc362f1191	d74907d5416d57a8fb1afef4db837c3d7e1ec0f30ed2914a2e8f8f18ba1d0887	2026-10-18 04:56:27.853111+00	20261018000000_push_subscriptions	\N	\N	2026-10-18 04:56:27.78283+00	1
\.


--
-- Data for Name: deliveries; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.deliveries (id, channel, recipient, subject, status, created_at) FROM stdin;
c283bfd4-9796-4560-94e7-cffb5ecebf69	PUSH	9028a3c8-0c76-4a94-be7a-77c358d5c054	Tu liga fue aprobada	SIMULATED	2026-10-18 04:56:44.064
ebac41cc-dae2-4f1c-acab-dee725d1b6c2	EMAIL	aficionado@demo.com	Jornada 1 programada	SIMULATED	2026-10-18 04:56:45.396
2ba3ab4b-29a6-4250-a34f-9caf56701908	PUSH	9028a3c8-0c76-4a94-be7a-77c358d5c054	Jornada 1 programada	SIMULATED	2026-10-18 04:56:45.396
04b10994-9b8f-43bb-84f1-776cf4372750	PUSH	60ba64af-6f05-486b-9848-837b76bba8a0	Jornada 1 programada	SIMULATED	2026-10-18 04:56:45.396
82a75f34-cc0e-489f-9bb5-e3a4568f726d	EMAIL	aficionado@demo.com	Jornada 2 programada	SIMULATED	2026-10-18 04:56:45.421
b2f6c201-adfd-4c14-be6a-3c355314bce1	PUSH	9028a3c8-0c76-4a94-be7a-77c358d5c054	Jornada 2 programada	SIMULATED	2026-10-18 04:56:45.421
beb896d4-e598-40a9-8642-455b84311674	PUSH	60ba64af-6f05-486b-9848-837b76bba8a0	Jornada 2 programada	SIMULATED	2026-10-18 04:56:45.421
dfaac886-f01e-4f31-8a32-d1eed082da7a	EMAIL	aficionado@demo.com	Jornada 3 programada	SIMULATED	2026-10-18 04:56:45.454
054d8c3e-60c8-4e06-9621-fdf411c5a1a1	PUSH	9028a3c8-0c76-4a94-be7a-77c358d5c054	Jornada 3 programada	SIMULATED	2026-10-18 04:56:45.454
43688f0a-0c9f-4a92-b7b7-1756687b5a58	PUSH	60ba64af-6f05-486b-9848-837b76bba8a0	Jornada 3 programada	SIMULATED	2026-10-18 04:56:45.454
fd09b2e5-a5fa-498b-a4dc-93549a0c3b66	EMAIL	arbitro@demo.com	Tienes un partido asignado	SIMULATED	2026-10-18 04:56:45.471
1f88b3f2-9702-4f9b-9f10-09135d84cd1b	EMAIL	aficionado@demo.com	Jornada 4 programada	SIMULATED	2026-10-18 04:56:45.505
38f7a29b-f690-46c3-81dd-03505b918b54	PUSH	9028a3c8-0c76-4a94-be7a-77c358d5c054	Jornada 4 programada	SIMULATED	2026-10-18 04:56:45.505
e3b1ef77-4730-4619-a1f2-d36ee4115f51	PUSH	60ba64af-6f05-486b-9848-837b76bba8a0	Jornada 4 programada	SIMULATED	2026-10-18 04:56:45.505
cfc9f9c1-0d42-4d3a-b26c-9614507be5af	EMAIL	ana.beltran@demo.com	Tienes un partido asignado	SIMULATED	2026-10-18 04:56:45.509
8064160d-7b66-4911-82a2-0c5113302efe	EMAIL	aficionado@demo.com	Jornada 5 programada	SIMULATED	2026-10-18 04:56:45.531
38ee2aec-b80c-447f-83fb-3085b8f7bd74	PUSH	9028a3c8-0c76-4a94-be7a-77c358d5c054	Jornada 5 programada	SIMULATED	2026-10-18 04:56:45.531
e060d195-124c-4268-9332-0744119aeb3f	PUSH	60ba64af-6f05-486b-9848-837b76bba8a0	Jornada 5 programada	SIMULATED	2026-10-18 04:56:45.531
7b1e36be-b15a-489c-8266-92b2c0969f59	EMAIL	ana.beltran@demo.com	Tienes un partido asignado	SIMULATED	2026-10-18 04:56:45.539
c5cb2a92-b8fd-447c-88e6-dacf8e7bc3cc	EMAIL	aficionado@demo.com	Jornada 6 programada	SIMULATED	2026-10-18 04:56:45.56
3bffc50d-35cb-4055-b34b-b0e8afe9ded3	PUSH	9028a3c8-0c76-4a94-be7a-77c358d5c054	Jornada 6 programada	SIMULATED	2026-10-18 04:56:45.56
3554b23a-adf6-49b2-9463-1c62093b9585	PUSH	60ba64af-6f05-486b-9848-837b76bba8a0	Jornada 6 programada	SIMULATED	2026-10-18 04:56:45.56
717b4494-9705-4dd6-84c4-1081980750bb	EMAIL	rafael.pacheco@demo.com	Tienes un partido asignado	SIMULATED	2026-10-18 04:56:45.573
f77226cf-e916-4bc0-8bcd-74c3309632e7	EMAIL	aficionado@demo.com	Jornada 7 programada	SIMULATED	2026-10-18 04:56:45.584
e1ab34f9-2905-4b14-9ded-d2508d8838f0	PUSH	9028a3c8-0c76-4a94-be7a-77c358d5c054	Jornada 7 programada	SIMULATED	2026-10-18 04:56:45.584
3507069d-8982-4bee-8de2-3924726f1b34	PUSH	60ba64af-6f05-486b-9848-837b76bba8a0	Jornada 7 programada	SIMULATED	2026-10-18 04:56:45.584
be09de62-d7a5-4106-91ca-421a396a3ab1	EMAIL	aficionado@demo.com	Jornada 8 programada	SIMULATED	2026-10-18 04:56:45.606
bb7f45f3-4d65-4d45-a7bc-521ac97ed935	PUSH	9028a3c8-0c76-4a94-be7a-77c358d5c054	Jornada 8 programada	SIMULATED	2026-10-18 04:56:45.606
93ad9c66-7ffc-4fb3-83bc-d20eb99bf5dd	PUSH	60ba64af-6f05-486b-9848-837b76bba8a0	Jornada 8 programada	SIMULATED	2026-10-18 04:56:45.606
dd6f1172-c3d1-48ec-bfd0-53fb17042916	EMAIL	arbitro@demo.com	Tienes un partido asignado	SIMULATED	2026-10-18 04:56:45.607
2f514fa8-ef39-41fc-baf6-b1cae8a0e82f	EMAIL	aficionado@demo.com	Jornada 9 programada	SIMULATED	2026-10-18 04:56:45.629
66dd1a70-fe0b-4ddf-9fb1-604336e7e5d3	PUSH	9028a3c8-0c76-4a94-be7a-77c358d5c054	Jornada 9 programada	SIMULATED	2026-10-18 04:56:45.629
6b2322cb-078d-4770-9fe6-32e95beff65d	PUSH	60ba64af-6f05-486b-9848-837b76bba8a0	Jornada 9 programada	SIMULATED	2026-10-18 04:56:45.629
76635970-067b-411c-bc6c-8dd58cac86d2	EMAIL	ana.beltran@demo.com	Tienes un partido asignado	SIMULATED	2026-10-18 04:56:45.636
7e6478b2-cc71-4996-a661-93c4b6bd2e33	EMAIL	aficionado@demo.com	Jornada 10 programada	SIMULATED	2026-10-18 04:56:45.651
05c09886-7849-423e-a1a4-3433bf340e3e	PUSH	9028a3c8-0c76-4a94-be7a-77c358d5c054	Jornada 10 programada	SIMULATED	2026-10-18 04:56:45.651
568bddbf-9550-4c80-bbf3-efd7a3858e93	PUSH	60ba64af-6f05-486b-9848-837b76bba8a0	Jornada 10 programada	SIMULATED	2026-10-18 04:56:45.651
1aeb2a5c-09b1-49d4-bab5-c36052a1dfe7	EMAIL	rafael.pacheco@demo.com	Tienes un partido asignado	SIMULATED	2026-10-18 04:56:45.66
7a5f3f7c-0d18-4d10-b36d-dbfc760c2ba8	EMAIL	arbitro@demo.com	Tienes un partido asignado	SIMULATED	2026-10-18 04:56:45.677
81ed3e0a-0bb6-46c5-9be3-27fd04c3ec3b	EMAIL	ana.beltran@demo.com	Tienes un partido asignado	SIMULATED	2026-10-18 04:56:45.697
18d5441e-4508-49d5-bc3a-d40d96128cbb	EMAIL	rafael.pacheco@demo.com	Tienes un partido asignado	SIMULATED	2026-10-18 04:56:45.714
ad026e5f-057e-405d-9379-1a46b5b1cb43	EMAIL	ana.beltran@demo.com	Tienes un partido asignado	SIMULATED	2026-10-18 04:56:45.739
1c3b6132-7284-4e85-bf5f-7a8e9b6ee573	EMAIL	ana.beltran@demo.com	Tienes un partido asignado	SIMULATED	2026-10-18 04:56:45.76
cd718b5a-1fb6-4d09-9cdd-6640f234608c	EMAIL	arbitro@demo.com	Tienes un partido asignado	SIMULATED	2026-10-18 04:56:45.774
fd9a7860-ae5b-4155-a8ae-a4536ab9781b	EMAIL	rafael.pacheco@demo.com	Tienes un partido asignado	SIMULATED	2026-10-18 04:56:45.789
0e6f4cf6-6638-4b81-9015-abd1f69f6574	EMAIL	ana.beltran@demo.com	Tienes un partido asignado	SIMULATED	2026-10-18 04:56:45.803
a6f6c056-cb5e-4697-a9b7-02ae4e945f96	EMAIL	arbitro@demo.com	Tienes un partido asignado	SIMULATED	2026-10-18 04:56:45.819
88866178-760b-4def-813a-3842c0273c60	EMAIL	ana.beltran@demo.com	Tienes un partido asignado	SIMULATED	2026-10-18 04:56:45.845
a90198d7-c260-4b79-aaad-0ba7e023570c	EMAIL	ana.beltran@demo.com	Tienes un partido asignado	SIMULATED	2026-10-18 04:56:45.868
d9d8573f-f13e-407d-b84a-3642bd35875b	EMAIL	arbitro@demo.com	Tienes un partido asignado	SIMULATED	2026-10-18 04:56:45.895
e4169590-6067-434d-95f9-71e56b3d8a1b	EMAIL	rafael.pacheco@demo.com	Tienes un partido asignado	SIMULATED	2026-10-18 04:56:45.91
4952a9b3-7208-4f1d-b809-bab150628066	EMAIL	ana.beltran@demo.com	Tienes un partido asignado	SIMULATED	2026-10-18 04:56:45.934
19de1eb6-0d9f-4107-bfc4-a31a61d2c8b1	EMAIL	arbitro@demo.com	Tienes un partido asignado	SIMULATED	2026-10-18 04:56:45.944
9015886f-4e99-4535-a88b-6667c3aafbd3	EMAIL	ana.beltran@demo.com	Tienes un partido asignado	SIMULATED	2026-10-18 04:56:45.958
8e55e285-6e55-4471-8856-07f89ecdbc7f	EMAIL	ana.beltran@demo.com	Tienes un partido asignado	SIMULATED	2026-10-18 04:56:45.976
1e9d029e-e5bf-4a19-be9e-a00260ec9061	EMAIL	rafael.pacheco@demo.com	Tienes un partido asignado	SIMULATED	2026-10-18 04:56:45.991
43aa35e1-05d9-43aa-acc5-09732e151332	EMAIL	rafael.pacheco@demo.com	Tienes un partido asignado	SIMULATED	2026-10-18 04:56:46.005
dcb140af-e281-40dd-973f-566e67830d71	EMAIL	ana.beltran@demo.com	Tienes un partido asignado	SIMULATED	2026-10-18 04:56:46.02
cf0a2ad1-a572-4f14-a47e-874dd51ac79a	EMAIL	arbitro@demo.com	Tienes un partido asignado	SIMULATED	2026-10-18 04:56:46.033
cb4e6e74-1ed3-4d47-9d92-ae26970e3e89	EMAIL	ana.beltran@demo.com	Tienes un partido asignado	SIMULATED	2026-10-18 04:56:46.049
f9f1353f-90a0-43b7-b489-b90d81d5a1d6	EMAIL	ana.beltran@demo.com	Tienes un partido asignado	SIMULATED	2026-10-18 04:56:46.062
6a87cd29-3100-4e2d-932f-b0786df32c25	EMAIL	aficionado@demo.com	Resultado final	SIMULATED	2026-10-18 04:56:50.06
1deef2c6-f916-41af-b02f-8e52f9de438f	PUSH	9028a3c8-0c76-4a94-be7a-77c358d5c054	Resultado final	SIMULATED	2026-10-18 04:56:50.06
670bee3c-025b-4bae-af60-1f84e3577b5e	PUSH	60ba64af-6f05-486b-9848-837b76bba8a0	Resultado final	SIMULATED	2026-10-18 04:56:50.06
5aac51b6-2698-462d-95d7-0bf511bc90f7	EMAIL	aficionado@demo.com	Resultado final	SIMULATED	2026-10-18 04:56:50.485
f271d0bf-e492-427b-8468-fe0752bc5421	PUSH	9028a3c8-0c76-4a94-be7a-77c358d5c054	Resultado final	SIMULATED	2026-10-18 04:56:50.485
94574177-c0bb-4b13-835e-8feeaeae9370	PUSH	60ba64af-6f05-486b-9848-837b76bba8a0	Resultado final	SIMULATED	2026-10-18 04:56:50.485
2a10ead6-ee65-47cd-ba5c-ee10f3c02ea4	EMAIL	aficionado@demo.com	Resultado final	SIMULATED	2026-10-18 04:56:50.902
619cb217-7f71-49af-a444-b10d396aa00a	PUSH	9028a3c8-0c76-4a94-be7a-77c358d5c054	Resultado final	SIMULATED	2026-10-18 04:56:50.902
97396370-8677-4ed6-b26f-7747215c8be0	PUSH	60ba64af-6f05-486b-9848-837b76bba8a0	Resultado final	SIMULATED	2026-10-18 04:56:50.902
4289155c-a1e5-49b1-81cd-12f8e0502ea0	EMAIL	aficionado@demo.com	Resultado final	SIMULATED	2026-10-18 04:56:51.209
72f51436-218e-4932-b030-e2b562c798b6	PUSH	9028a3c8-0c76-4a94-be7a-77c358d5c054	Resultado final	SIMULATED	2026-10-18 04:56:51.209
d7b2582e-a166-478b-9ddb-5cc7794ec065	PUSH	60ba64af-6f05-486b-9848-837b76bba8a0	Resultado final	SIMULATED	2026-10-18 04:56:51.209
8acbdbec-4498-4b9e-ba68-43c0a9da96b8	EMAIL	aficionado@demo.com	Resultado final	SIMULATED	2026-10-18 04:56:51.588
a56d99e5-a117-46f2-926b-2f9721ee5b2e	PUSH	9028a3c8-0c76-4a94-be7a-77c358d5c054	Resultado final	SIMULATED	2026-10-18 04:56:51.588
c8a1ba45-08b1-445c-8c4d-df10663fb9a5	PUSH	60ba64af-6f05-486b-9848-837b76bba8a0	Resultado final	SIMULATED	2026-10-18 04:56:51.588
131c4697-d96f-4563-9e0c-81a37d5b64f6	EMAIL	aficionado@demo.com	Resultado final	SIMULATED	2026-10-18 04:56:51.937
c2446bf1-5ea3-4dbb-8c3f-ca9046c3e3e6	PUSH	9028a3c8-0c76-4a94-be7a-77c358d5c054	Resultado final	SIMULATED	2026-10-18 04:56:51.937
ff5c8f7d-3b62-4963-8459-123f49e43695	PUSH	60ba64af-6f05-486b-9848-837b76bba8a0	Resultado final	SIMULATED	2026-10-18 04:56:51.937
16aae86f-acc1-4468-a57b-4dd2dd3c3861	EMAIL	aficionado@demo.com	Resultado final	SIMULATED	2026-10-18 04:56:52.314
a155f8a9-0bda-49d3-b20e-02993f118ecd	PUSH	9028a3c8-0c76-4a94-be7a-77c358d5c054	Resultado final	SIMULATED	2026-10-18 04:56:52.314
c0aa7b9e-7a7c-43d2-b65c-050d3823e34d	PUSH	60ba64af-6f05-486b-9848-837b76bba8a0	Resultado final	SIMULATED	2026-10-18 04:56:52.314
e35f6655-f1d0-41a5-bff3-d250be84dac6	EMAIL	aficionado@demo.com	Resultado final	SIMULATED	2026-10-18 04:56:52.539
85d230de-a905-4099-8321-01795bd31f9a	PUSH	9028a3c8-0c76-4a94-be7a-77c358d5c054	Resultado final	SIMULATED	2026-10-18 04:56:52.539
09a72b72-e8a9-4f3b-827e-aa08f67ff1a9	PUSH	60ba64af-6f05-486b-9848-837b76bba8a0	Resultado final	SIMULATED	2026-10-18 04:56:52.539
98bf07f3-f692-4a98-aa63-e45cd77a769c	EMAIL	aficionado@demo.com	Resultado final	SIMULATED	2026-10-18 04:56:52.819
1c29f311-d35f-44c2-8eed-7205b676dda2	PUSH	9028a3c8-0c76-4a94-be7a-77c358d5c054	Resultado final	SIMULATED	2026-10-18 04:56:52.819
b55b01a6-0963-4c40-89cd-8669834e1e63	PUSH	60ba64af-6f05-486b-9848-837b76bba8a0	Resultado final	SIMULATED	2026-10-18 04:56:52.819
edd76b31-90c8-449d-9754-72a325c3286b	EMAIL	aficionado@demo.com	Resultado final	SIMULATED	2026-10-18 04:56:53.014
9e635311-913b-40c1-9f94-b52e3a69fa05	PUSH	9028a3c8-0c76-4a94-be7a-77c358d5c054	Resultado final	SIMULATED	2026-10-18 04:56:53.014
f7ec9761-41bc-4e8b-8df7-3367861a7f22	PUSH	60ba64af-6f05-486b-9848-837b76bba8a0	Resultado final	SIMULATED	2026-10-18 04:56:53.014
338acdf5-e801-41dc-9795-9045f0aef978	EMAIL	aficionado@demo.com	Resultado final	SIMULATED	2026-10-18 04:56:53.219
ba3ec4a0-10ed-4196-9847-6a7e5b46b414	PUSH	9028a3c8-0c76-4a94-be7a-77c358d5c054	Resultado final	SIMULATED	2026-10-18 04:56:53.219
31695a7d-dfb5-4139-91dc-34907dbd039e	PUSH	60ba64af-6f05-486b-9848-837b76bba8a0	Resultado final	SIMULATED	2026-10-18 04:56:53.219
87f25925-d9dd-4f94-aacf-b81d79ef83c4	EMAIL	aficionado@demo.com	Resultado final	SIMULATED	2026-10-18 04:56:53.467
c20445cb-f33d-4085-84e7-e0d4029fb655	PUSH	9028a3c8-0c76-4a94-be7a-77c358d5c054	Resultado final	SIMULATED	2026-10-18 04:56:53.467
944cb708-8401-4966-932c-c9997dfc2dd5	PUSH	60ba64af-6f05-486b-9848-837b76bba8a0	Resultado final	SIMULATED	2026-10-18 04:56:53.467
d2570d75-705f-4d52-9cf5-3ebd59894e80	EMAIL	aficionado@demo.com	Resultado final	SIMULATED	2026-10-18 04:56:53.875
7c084a0f-2b96-4857-aa22-16c09306da56	PUSH	9028a3c8-0c76-4a94-be7a-77c358d5c054	Resultado final	SIMULATED	2026-10-18 04:56:53.875
ed7e693d-6d0c-4b0e-98db-bca28c144374	PUSH	60ba64af-6f05-486b-9848-837b76bba8a0	Resultado final	SIMULATED	2026-10-18 04:56:53.875
20b483e5-1610-4497-997d-205ed22a4807	EMAIL	aficionado@demo.com	Resultado final	SIMULATED	2026-10-18 04:56:54.084
61d6d445-a51c-4d47-8120-84d55e29325e	PUSH	9028a3c8-0c76-4a94-be7a-77c358d5c054	Resultado final	SIMULATED	2026-10-18 04:56:54.084
44dea882-26ec-48b9-842a-6f7ec8e837eb	PUSH	60ba64af-6f05-486b-9848-837b76bba8a0	Resultado final	SIMULATED	2026-10-18 04:56:54.084
5cc63aaf-0779-4283-bc8b-5242d9caa99e	EMAIL	aficionado@demo.com	Resultado final	SIMULATED	2026-10-18 04:56:54.287
b5fe0967-7537-4417-8361-8a4701a85844	PUSH	9028a3c8-0c76-4a94-be7a-77c358d5c054	Resultado final	SIMULATED	2026-10-18 04:56:54.287
eecb80ba-f5f1-49a5-a61d-445d54f763d8	PUSH	60ba64af-6f05-486b-9848-837b76bba8a0	Resultado final	SIMULATED	2026-10-18 04:56:54.287
f0137266-09a7-4a60-b111-3a95d12d422f	EMAIL	aficionado@demo.com	Resultado final	SIMULATED	2026-10-18 04:56:54.601
04ea2534-f338-4fc8-9453-615961034ce8	PUSH	9028a3c8-0c76-4a94-be7a-77c358d5c054	Resultado final	SIMULATED	2026-10-18 04:56:54.601
7aa85907-4760-4291-ad2f-2941388ed2ab	PUSH	60ba64af-6f05-486b-9848-837b76bba8a0	Resultado final	SIMULATED	2026-10-18 04:56:54.601
6da0aac3-597a-462c-8dd9-6cbbac3a97c3	EMAIL	aficionado@demo.com	Resultado final	SIMULATED	2026-10-18 04:56:54.77
a7b0900d-79ba-4e13-945d-e29e105e6d76	PUSH	9028a3c8-0c76-4a94-be7a-77c358d5c054	Resultado final	SIMULATED	2026-10-18 04:56:54.77
b4a0abdb-ec41-4cbc-965c-9ec6eb08d3f4	PUSH	60ba64af-6f05-486b-9848-837b76bba8a0	Resultado final	SIMULATED	2026-10-18 04:56:54.77
a635f3d7-5e11-44af-9b79-0c57525fa12a	EMAIL	aficionado@demo.com	Resultado final	SIMULATED	2026-10-18 04:56:55.009
e821fb58-0790-4808-b0c2-5e1001a89f46	PUSH	9028a3c8-0c76-4a94-be7a-77c358d5c054	Resultado final	SIMULATED	2026-10-18 04:56:55.009
41e5820b-c6ad-4a99-acb2-f7eb854c21a1	PUSH	60ba64af-6f05-486b-9848-837b76bba8a0	Resultado final	SIMULATED	2026-10-18 04:56:55.009
3497b0f2-7104-4850-9652-bb8076deacbe	EMAIL	aficionado@demo.com	Resultado final	SIMULATED	2026-10-18 04:56:55.227
6d432905-a824-4a78-b00e-723ac8b1e710	PUSH	9028a3c8-0c76-4a94-be7a-77c358d5c054	Resultado final	SIMULATED	2026-10-18 04:56:55.227
1ed8be85-8a20-47c1-91ac-745b8f20707c	PUSH	60ba64af-6f05-486b-9848-837b76bba8a0	Resultado final	SIMULATED	2026-10-18 04:56:55.227
eab254ed-fff9-433d-be7a-fc9a636b053c	EMAIL	aficionado@demo.com	Resultado final	SIMULATED	2026-10-18 04:56:55.474
fe9fe8ed-c1e8-4143-aa9e-2b08e81397b7	PUSH	9028a3c8-0c76-4a94-be7a-77c358d5c054	Resultado final	SIMULATED	2026-10-18 04:56:55.474
8b581eb0-d684-4e29-aaea-d79b85a6d3a9	PUSH	60ba64af-6f05-486b-9848-837b76bba8a0	Resultado final	SIMULATED	2026-10-18 04:56:55.474
ce06c42f-202c-408d-b191-58dca8c6ea60	EMAIL	aficionado@demo.com	Partido suspendido	SIMULATED	2026-10-18 04:56:55.615
3ab7072b-c915-4da8-83d1-2da2b60a075a	PUSH	9028a3c8-0c76-4a94-be7a-77c358d5c054	Partido suspendido	SIMULATED	2026-10-18 04:56:55.615
5df5d8ff-113c-497d-97d6-08a9060ddfe6	PUSH	60ba64af-6f05-486b-9848-837b76bba8a0	Partido suspendido	SIMULATED	2026-10-18 04:56:55.615
cc58fbe0-7cd2-4733-84f3-0f8ac1e62aeb	EMAIL	aficionado@demo.com	Cambio de horario	SIMULATED	2026-10-18 04:56:55.668
ff161961-542f-4bb3-8225-338777937087	PUSH	9028a3c8-0c76-4a94-be7a-77c358d5c054	Cambio de horario	SIMULATED	2026-10-18 04:56:55.668
a9590909-613f-4e2e-a1ee-4ba7e2223c04	PUSH	60ba64af-6f05-486b-9848-837b76bba8a0	Cambio de horario	SIMULATED	2026-10-18 04:56:55.668
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.notifications (id, user_id, email, role, type, title, body, link, read, event_id, dedupe_key, created_at) FROM stdin;
459ba39d-2461-42ec-be84-173047de5e21	\N	\N	ADMIN	USER_REGISTERED	Nuevo usuario registrado	Laura Gómez (organizador@demo.com) se registró como organizador.	/admin?tab=usuarios	f	b7976cd5-9edf-4b26-a15d-3226493fded6	b7976cd5-9edf-4b26-a15d-3226493fded6:ADMIN	2026-10-18 04:56:43.928
73b38396-b0a6-407a-9d7a-8c6e01100e97	\N	\N	ADMIN	LEAGUE_PENDING	Nueva liga pendiente de aprobación	Laura Gómez creó la liga "Liga Amateur de Montería". Revísala para autorizarla.	/admin?tab=ligas	f	0bbba817-cfb8-45bb-afc2-63d498163fda	0bbba817-cfb8-45bb-afc2-63d498163fda:ADMIN	2026-10-18 04:56:44.027
bbe71a2b-4561-4229-8e5e-0a136f4e89b3	9028a3c8-0c76-4a94-be7a-77c358d5c054	\N	\N	LEAGUE_APPROVED	Tu liga fue aprobada	La liga "Liga Amateur de Montería" fue aprobada. Ya es pública y puedes generar el calendario. Nota del administrador: Documentación de la liga verificada	/panel/ligas/b7316ac3-ba86-4eec-acbd-1c0f125c5580	f	7a812e49-71fa-45f1-93d2-2e314ac889b3	7a812e49-71fa-45f1-93d2-2e314ac889b3:9028a3c8-0c76-4a94-be7a-77c358d5c054	2026-10-18 04:56:44.053
c9aea9e3-2b76-4481-a83b-cfc1163ddd20	\N	\N	ADMIN	USER_REGISTERED	Nuevo usuario registrado	Mario Arroyo (arbitro@demo.com) se registró como árbitro.	/admin?tab=usuarios	f	335c801f-dcd7-4c52-aae6-2f8dd1a54064	335c801f-dcd7-4c52-aae6-2f8dd1a54064:ADMIN	2026-10-18 04:56:44.983
734936f3-6b6e-448e-a4af-bfec5b35b88e	\N	\N	ADMIN	USER_REGISTERED	Nuevo usuario registrado	Camilo Ruiz (aficionado@demo.com) se registró como aficionado.	/admin?tab=usuarios	f	8992723d-bc11-42b0-aa18-6ca16c3bc581	8992723d-bc11-42b0-aa18-6ca16c3bc581:ADMIN	2026-10-18 04:56:45.15
f4c1d080-0c12-4e1c-95f3-11f97a17837b	9028a3c8-0c76-4a94-be7a-77c358d5c054	\N	\N	FIXTURE_PUBLISHED	Jornada 1 programada	Liga Amateur de Montería · Libre: 3 partido(s) con horario confirmado.	/ligas/b7316ac3-ba86-4eec-acbd-1c0f125c5580?tab=calendario	f	bb949392-9ec8-4694-9b3d-899a732d0e39	bb949392-9ec8-4694-9b3d-899a732d0e39:9028a3c8-0c76-4a94-be7a-77c358d5c054	2026-10-18 04:56:45.378
5d4420f6-2838-4f97-8471-7bd46fdc3ae8	60ba64af-6f05-486b-9848-837b76bba8a0	\N	\N	FIXTURE_PUBLISHED	Jornada 1 programada	Liga Amateur de Montería · Libre: 3 partido(s) con horario confirmado.	/ligas/b7316ac3-ba86-4eec-acbd-1c0f125c5580?tab=calendario	f	bb949392-9ec8-4694-9b3d-899a732d0e39	bb949392-9ec8-4694-9b3d-899a732d0e39:60ba64af-6f05-486b-9848-837b76bba8a0	2026-10-18 04:56:45.378
feccd1b9-b327-4865-a4a0-2732080562d4	9028a3c8-0c76-4a94-be7a-77c358d5c054	\N	\N	FIXTURE_PUBLISHED	Jornada 2 programada	Liga Amateur de Montería · Libre: 3 partido(s) con horario confirmado.	/ligas/b7316ac3-ba86-4eec-acbd-1c0f125c5580?tab=calendario	f	2471353f-d0b4-4b39-ad45-b545f16cb1c5	2471353f-d0b4-4b39-ad45-b545f16cb1c5:9028a3c8-0c76-4a94-be7a-77c358d5c054	2026-10-18 04:56:45.409
2a1e47f6-a37d-4078-93c2-67fcda1715c0	60ba64af-6f05-486b-9848-837b76bba8a0	\N	\N	FIXTURE_PUBLISHED	Jornada 2 programada	Liga Amateur de Montería · Libre: 3 partido(s) con horario confirmado.	/ligas/b7316ac3-ba86-4eec-acbd-1c0f125c5580?tab=calendario	f	2471353f-d0b4-4b39-ad45-b545f16cb1c5	2471353f-d0b4-4b39-ad45-b545f16cb1c5:60ba64af-6f05-486b-9848-837b76bba8a0	2026-10-18 04:56:45.409
38d3c574-d6e4-4390-aba4-9f83ac5b3e1c	9028a3c8-0c76-4a94-be7a-77c358d5c054	\N	\N	FIXTURE_PUBLISHED	Jornada 3 programada	Liga Amateur de Montería · Libre: 3 partido(s) con horario confirmado.	/ligas/b7316ac3-ba86-4eec-acbd-1c0f125c5580?tab=calendario	f	400daa45-9d5e-4e8e-b622-fea428563c2b	400daa45-9d5e-4e8e-b622-fea428563c2b:9028a3c8-0c76-4a94-be7a-77c358d5c054	2026-10-18 04:56:45.441
3fa36b93-dfdd-4710-ae43-793e20494899	60ba64af-6f05-486b-9848-837b76bba8a0	\N	\N	FIXTURE_PUBLISHED	Jornada 3 programada	Liga Amateur de Montería · Libre: 3 partido(s) con horario confirmado.	/ligas/b7316ac3-ba86-4eec-acbd-1c0f125c5580?tab=calendario	f	400daa45-9d5e-4e8e-b622-fea428563c2b	400daa45-9d5e-4e8e-b622-fea428563c2b:60ba64af-6f05-486b-9848-837b76bba8a0	2026-10-18 04:56:45.441
94dd151b-38e4-4a1e-b3c2-4e2ab1aefa2f	\N	arbitro@demo.com	\N	REFEREE_ASSIGNED	Tienes un partido asignado	Tigres del Sinú vs Atlético Cereté · dom, 30 de ago, 08:00 a. m. · Estadio Municipal de Montería. Confírmalo desde tu panel.	/panel/arbitro	f	dc8e4039-e528-4fc7-8d7a-60dffdd31fef	dc8e4039-e528-4fc7-8d7a-60dffdd31fef:arbitro@demo.com	2026-10-18 04:56:45.463
42004933-ea78-46d2-b006-80fdc3c7af49	9028a3c8-0c76-4a94-be7a-77c358d5c054	\N	\N	FIXTURE_PUBLISHED	Jornada 4 programada	Liga Amateur de Montería · Libre: 3 partido(s) con horario confirmado.	/ligas/b7316ac3-ba86-4eec-acbd-1c0f125c5580?tab=calendario	f	e18e1454-e433-4e74-8ae3-bed6e6852acb	e18e1454-e433-4e74-8ae3-bed6e6852acb:9028a3c8-0c76-4a94-be7a-77c358d5c054	2026-10-18 04:56:45.493
562b3cf7-481f-481f-a555-321adf33ad90	60ba64af-6f05-486b-9848-837b76bba8a0	\N	\N	FIXTURE_PUBLISHED	Jornada 4 programada	Liga Amateur de Montería · Libre: 3 partido(s) con horario confirmado.	/ligas/b7316ac3-ba86-4eec-acbd-1c0f125c5580?tab=calendario	f	e18e1454-e433-4e74-8ae3-bed6e6852acb	e18e1454-e433-4e74-8ae3-bed6e6852acb:60ba64af-6f05-486b-9848-837b76bba8a0	2026-10-18 04:56:45.493
f52cdca0-86f8-4475-af81-d45cf6447868	\N	ana.beltran@demo.com	\N	REFEREE_ASSIGNED	Tienes un partido asignado	Deportivo La Ribera vs Real Lorica · dom, 30 de ago, 02:00 p. m. · Polideportivo del Sur. Confírmalo desde tu panel.	/panel/arbitro	f	18df6e2e-7f5f-4ff8-b5f9-9efbcc61b709	18df6e2e-7f5f-4ff8-b5f9-9efbcc61b709:ana.beltran@demo.com	2026-10-18 04:56:45.501
1b659847-407b-4467-8e5c-7398e287f478	9028a3c8-0c76-4a94-be7a-77c358d5c054	\N	\N	FIXTURE_PUBLISHED	Jornada 5 programada	Liga Amateur de Montería · Libre: 3 partido(s) con horario confirmado.	/ligas/b7316ac3-ba86-4eec-acbd-1c0f125c5580?tab=calendario	f	4dd8e3d1-9648-4338-afb6-fa6b9aab4a78	4dd8e3d1-9648-4338-afb6-fa6b9aab4a78:9028a3c8-0c76-4a94-be7a-77c358d5c054	2026-10-18 04:56:45.52
0d17658d-7fe4-4959-b8cb-f080a9419fab	60ba64af-6f05-486b-9848-837b76bba8a0	\N	\N	FIXTURE_PUBLISHED	Jornada 5 programada	Liga Amateur de Montería · Libre: 3 partido(s) con horario confirmado.	/ligas/b7316ac3-ba86-4eec-acbd-1c0f125c5580?tab=calendario	f	4dd8e3d1-9648-4338-afb6-fa6b9aab4a78	4dd8e3d1-9648-4338-afb6-fa6b9aab4a78:60ba64af-6f05-486b-9848-837b76bba8a0	2026-10-18 04:56:45.52
16285086-b557-4052-869d-7b408912b522	\N	ana.beltran@demo.com	\N	REFEREE_ASSIGNED	Tienes un partido asignado	Halcones FC vs Leones de Montería · dom, 30 de ago, 04:00 p. m. · Polideportivo del Sur. Confírmalo desde tu panel.	/panel/arbitro	f	893ff2ff-7d1b-4012-8ee4-87bbd4b90299	893ff2ff-7d1b-4012-8ee4-87bbd4b90299:ana.beltran@demo.com	2026-10-18 04:56:45.532
5d450f3d-aa01-4c80-afd5-1d08760d4542	9028a3c8-0c76-4a94-be7a-77c358d5c054	\N	\N	FIXTURE_PUBLISHED	Jornada 6 programada	Liga Amateur de Montería · Libre: 3 partido(s) con horario confirmado.	/ligas/b7316ac3-ba86-4eec-acbd-1c0f125c5580?tab=calendario	f	5f045895-fd96-4875-af2e-c8def62a5c64	5f045895-fd96-4875-af2e-c8def62a5c64:9028a3c8-0c76-4a94-be7a-77c358d5c054	2026-10-18 04:56:45.546
ac3ad426-99fd-4f3c-949b-bab9e91b9e14	60ba64af-6f05-486b-9848-837b76bba8a0	\N	\N	FIXTURE_PUBLISHED	Jornada 6 programada	Liga Amateur de Montería · Libre: 3 partido(s) con horario confirmado.	/ligas/b7316ac3-ba86-4eec-acbd-1c0f125c5580?tab=calendario	f	5f045895-fd96-4875-af2e-c8def62a5c64	5f045895-fd96-4875-af2e-c8def62a5c64:60ba64af-6f05-486b-9848-837b76bba8a0	2026-10-18 04:56:45.546
d993f1ca-6c97-4877-8fe9-ee1a348cd215	\N	rafael.pacheco@demo.com	\N	REFEREE_ASSIGNED	Tienes un partido asignado	Deportivo La Ribera vs Tigres del Sinú · dom, 6 de sept, 08:00 a. m. · Estadio Municipal de Montería. Confírmalo desde tu panel.	/panel/arbitro	f	642d41d0-722f-4a31-bc27-9cd73def7fa6	642d41d0-722f-4a31-bc27-9cd73def7fa6:rafael.pacheco@demo.com	2026-10-18 04:56:45.566
3874d4cb-d4f7-4898-8d01-88ad7927dfbc	9028a3c8-0c76-4a94-be7a-77c358d5c054	\N	\N	FIXTURE_PUBLISHED	Jornada 7 programada	Liga Amateur de Montería · Libre: 3 partido(s) con horario confirmado.	/ligas/b7316ac3-ba86-4eec-acbd-1c0f125c5580?tab=calendario	f	6780e4b9-a5da-4e16-81b3-dc510eafda35	6780e4b9-a5da-4e16-81b3-dc510eafda35:9028a3c8-0c76-4a94-be7a-77c358d5c054	2026-10-18 04:56:45.574
b22d7550-289b-419f-bda6-83c38724c5a6	60ba64af-6f05-486b-9848-837b76bba8a0	\N	\N	FIXTURE_PUBLISHED	Jornada 7 programada	Liga Amateur de Montería · Libre: 3 partido(s) con horario confirmado.	/ligas/b7316ac3-ba86-4eec-acbd-1c0f125c5580?tab=calendario	f	6780e4b9-a5da-4e16-81b3-dc510eafda35	6780e4b9-a5da-4e16-81b3-dc510eafda35:60ba64af-6f05-486b-9848-837b76bba8a0	2026-10-18 04:56:45.574
43fcab91-9b7e-4328-bdb2-6f1037794ec7	9028a3c8-0c76-4a94-be7a-77c358d5c054	\N	\N	FIXTURE_PUBLISHED	Jornada 8 programada	Liga Amateur de Montería · Libre: 3 partido(s) con horario confirmado.	/ligas/b7316ac3-ba86-4eec-acbd-1c0f125c5580?tab=calendario	f	7c635167-c54e-430c-9a69-7b9f4de57ba2	7c635167-c54e-430c-9a69-7b9f4de57ba2:9028a3c8-0c76-4a94-be7a-77c358d5c054	2026-10-18 04:56:45.599
58b55da8-0b57-4ab1-a6cb-438e0e1de147	60ba64af-6f05-486b-9848-837b76bba8a0	\N	\N	FIXTURE_PUBLISHED	Jornada 8 programada	Liga Amateur de Montería · Libre: 3 partido(s) con horario confirmado.	/ligas/b7316ac3-ba86-4eec-acbd-1c0f125c5580?tab=calendario	f	7c635167-c54e-430c-9a69-7b9f4de57ba2	7c635167-c54e-430c-9a69-7b9f4de57ba2:60ba64af-6f05-486b-9848-837b76bba8a0	2026-10-18 04:56:45.599
fc2ca141-57c8-4477-a98e-ada5204492a8	9028a3c8-0c76-4a94-be7a-77c358d5c054	\N	\N	FIXTURE_PUBLISHED	Jornada 9 programada	Liga Amateur de Montería · Libre: 3 partido(s) con horario confirmado.	/ligas/b7316ac3-ba86-4eec-acbd-1c0f125c5580?tab=calendario	f	e7e0a383-b3c9-434a-8303-796c62144dc2	e7e0a383-b3c9-434a-8303-796c62144dc2:9028a3c8-0c76-4a94-be7a-77c358d5c054	2026-10-18 04:56:45.619
0d35cd86-f716-4518-bd56-3e6457c697be	60ba64af-6f05-486b-9848-837b76bba8a0	\N	\N	FIXTURE_PUBLISHED	Jornada 9 programada	Liga Amateur de Montería · Libre: 3 partido(s) con horario confirmado.	/ligas/b7316ac3-ba86-4eec-acbd-1c0f125c5580?tab=calendario	f	e7e0a383-b3c9-434a-8303-796c62144dc2	e7e0a383-b3c9-434a-8303-796c62144dc2:60ba64af-6f05-486b-9848-837b76bba8a0	2026-10-18 04:56:45.619
c064b30d-4436-4fdf-993b-196a83ba49b3	\N	ana.beltran@demo.com	\N	REFEREE_ASSIGNED	Tienes un partido asignado	Halcones FC vs Atlético Cereté · dom, 6 de sept, 02:00 p. m. · Polideportivo del Sur. Confírmalo desde tu panel.	/panel/arbitro	f	3d4e1852-b1d9-4929-9ebf-7b91814fa4f6	3d4e1852-b1d9-4929-9ebf-7b91814fa4f6:ana.beltran@demo.com	2026-10-18 04:56:45.628
6c619bc6-6746-4439-be60-8219b09ddc9b	\N	arbitro@demo.com	\N	REFEREE_ASSIGNED	Tienes un partido asignado	Leones de Montería vs Real Lorica · dom, 6 de sept, 10:00 a. m. · Estadio Municipal de Montería. Confírmalo desde tu panel.	/panel/arbitro	f	bb3b7696-54c9-423c-90a2-94739e93721e	bb3b7696-54c9-423c-90a2-94739e93721e:arbitro@demo.com	2026-10-18 04:56:45.601
19e7ecc7-8530-42a1-8554-fe00a33cfd79	9028a3c8-0c76-4a94-be7a-77c358d5c054	\N	\N	FIXTURE_PUBLISHED	Jornada 10 programada	Liga Amateur de Montería · Libre: 3 partido(s) con horario confirmado.	/ligas/b7316ac3-ba86-4eec-acbd-1c0f125c5580?tab=calendario	f	808bd127-6d79-41ac-b21a-b4ee480152a9	808bd127-6d79-41ac-b21a-b4ee480152a9:9028a3c8-0c76-4a94-be7a-77c358d5c054	2026-10-18 04:56:45.641
720288b1-8741-459d-b6ec-65549d102ab0	60ba64af-6f05-486b-9848-837b76bba8a0	\N	\N	FIXTURE_PUBLISHED	Jornada 10 programada	Liga Amateur de Montería · Libre: 3 partido(s) con horario confirmado.	/ligas/b7316ac3-ba86-4eec-acbd-1c0f125c5580?tab=calendario	f	808bd127-6d79-41ac-b21a-b4ee480152a9	808bd127-6d79-41ac-b21a-b4ee480152a9:60ba64af-6f05-486b-9848-837b76bba8a0	2026-10-18 04:56:45.641
41e54906-b7c0-4788-80d9-79510ca53f62	\N	rafael.pacheco@demo.com	\N	REFEREE_ASSIGNED	Tienes un partido asignado	Tigres del Sinú vs Halcones FC · dom, 13 de sept, 08:00 a. m. · Estadio Municipal de Montería. Confírmalo desde tu panel.	/panel/arbitro	f	8422bd11-9235-4242-9b6c-42961f1e43ca	8422bd11-9235-4242-9b6c-42961f1e43ca:rafael.pacheco@demo.com	2026-10-18 04:56:45.656
e0cc23ab-067e-410e-98e8-b5c6e75fbff7	\N	arbitro@demo.com	\N	REFEREE_ASSIGNED	Tienes un partido asignado	Real Lorica vs Atlético Cereté · dom, 13 de sept, 10:00 a. m. · Estadio Municipal de Montería. Confírmalo desde tu panel.	/panel/arbitro	f	8aacbee3-0ae0-4b99-849b-e9df403d9d9b	8aacbee3-0ae0-4b99-849b-e9df403d9d9b:arbitro@demo.com	2026-10-18 04:56:45.672
4ba0fceb-61bc-4f60-8142-5f28787578e6	\N	ana.beltran@demo.com	\N	REFEREE_ASSIGNED	Tienes un partido asignado	Leones de Montería vs Deportivo La Ribera · dom, 13 de sept, 02:00 p. m. · Polideportivo del Sur. Confírmalo desde tu panel.	/panel/arbitro	f	ff54bf32-b584-404e-a707-68f49adbdb18	ff54bf32-b584-404e-a707-68f49adbdb18:ana.beltran@demo.com	2026-10-18 04:56:45.692
0c9d9915-0d72-41f5-87f6-4234b05891d8	\N	rafael.pacheco@demo.com	\N	REFEREE_ASSIGNED	Tienes un partido asignado	Real Lorica vs Halcones FC · dom, 20 de sept, 08:00 a. m. · Estadio Municipal de Montería. Confírmalo desde tu panel.	/panel/arbitro	f	d0e9c9ed-b96c-499c-b68c-1bc0dfed7458	d0e9c9ed-b96c-499c-b68c-1bc0dfed7458:rafael.pacheco@demo.com	2026-10-18 04:56:45.712
c9ddded3-1f88-4fd7-9123-90d6a8d6b4f4	\N	ana.beltran@demo.com	\N	REFEREE_ASSIGNED	Tienes un partido asignado	Leones de Montería vs Tigres del Sinú · dom, 20 de sept, 02:00 p. m. · Polideportivo del Sur. Confírmalo desde tu panel.	/panel/arbitro	f	62a1161d-5ffa-4d38-9b41-c8a7810837a1	62a1161d-5ffa-4d38-9b41-c8a7810837a1:ana.beltran@demo.com	2026-10-18 04:56:45.734
c1371857-bf55-489d-aa51-bdd8dc6404c4	\N	ana.beltran@demo.com	\N	REFEREE_ASSIGNED	Tienes un partido asignado	Atlético Cereté vs Deportivo La Ribera · dom, 20 de sept, 04:00 p. m. · Polideportivo del Sur. Confírmalo desde tu panel.	/panel/arbitro	f	80672a3f-09ae-4d53-a829-329e5ebb56b8	80672a3f-09ae-4d53-a829-329e5ebb56b8:ana.beltran@demo.com	2026-10-18 04:56:45.756
d1346ba6-7b6e-429f-8845-3f2832cc54a7	\N	arbitro@demo.com	\N	REFEREE_ASSIGNED	Tienes un partido asignado	Tigres del Sinú vs Real Lorica · dom, 27 de sept, 08:00 a. m. · Estadio Municipal de Montería. Confírmalo desde tu panel.	/panel/arbitro	f	d05b1340-5233-449b-a8be-3b11e00cf1e1	d05b1340-5233-449b-a8be-3b11e00cf1e1:arbitro@demo.com	2026-10-18 04:56:45.77
dc7cfe99-1564-45b9-a884-b17411e29ced	\N	rafael.pacheco@demo.com	\N	REFEREE_ASSIGNED	Tienes un partido asignado	Deportivo La Ribera vs Halcones FC · dom, 27 de sept, 10:00 a. m. · Estadio Municipal de Montería. Confírmalo desde tu panel.	/panel/arbitro	f	7c4dd51c-2dd5-43c8-a58d-97357d55e711	7c4dd51c-2dd5-43c8-a58d-97357d55e711:rafael.pacheco@demo.com	2026-10-18 04:56:45.784
54bf65d1-c011-4d86-b8a6-b152ed32e7b9	\N	ana.beltran@demo.com	\N	REFEREE_ASSIGNED	Tienes un partido asignado	Atlético Cereté vs Leones de Montería · dom, 27 de sept, 02:00 p. m. · Polideportivo del Sur. Confírmalo desde tu panel.	/panel/arbitro	f	9df15a3d-f417-42b2-8741-24a876ba31ed	9df15a3d-f417-42b2-8741-24a876ba31ed:ana.beltran@demo.com	2026-10-18 04:56:45.799
bd80b006-7c6d-4ac2-b0f9-468ac02ca0cb	\N	arbitro@demo.com	\N	REFEREE_ASSIGNED	Tienes un partido asignado	Real Lorica vs Deportivo La Ribera · dom, 4 de oct, 08:00 a. m. · Estadio Municipal de Montería. Confírmalo desde tu panel.	/panel/arbitro	f	478a04c0-9d1e-45fe-980b-3fc7d669e606	478a04c0-9d1e-45fe-980b-3fc7d669e606:arbitro@demo.com	2026-10-18 04:56:45.814
d5c58af5-da3a-4b31-b01a-f0fae0544268	\N	ana.beltran@demo.com	\N	REFEREE_ASSIGNED	Tienes un partido asignado	Atlético Cereté vs Tigres del Sinú · dom, 4 de oct, 02:00 p. m. · Polideportivo del Sur. Confírmalo desde tu panel.	/panel/arbitro	f	bbead968-3ef8-4355-803b-7452df429dbc	bbead968-3ef8-4355-803b-7452df429dbc:ana.beltran@demo.com	2026-10-18 04:56:45.839
be507b7b-39de-4c10-a050-e9ec5f6a8ca6	\N	ana.beltran@demo.com	\N	REFEREE_ASSIGNED	Tienes un partido asignado	Leones de Montería vs Halcones FC · dom, 4 de oct, 04:00 p. m. · Polideportivo del Sur. Confírmalo desde tu panel.	/panel/arbitro	f	abe38894-761e-43de-a90b-b76432ce6a3f	abe38894-761e-43de-a90b-b76432ce6a3f:ana.beltran@demo.com	2026-10-18 04:56:45.86
4aaa83d1-ce62-43a5-a345-7379c742734d	\N	arbitro@demo.com	\N	REFEREE_ASSIGNED	Tienes un partido asignado	Tigres del Sinú vs Deportivo La Ribera · dom, 11 de oct, 08:00 a. m. · Estadio Municipal de Montería. Confírmalo desde tu panel.	/panel/arbitro	f	ac9fad73-e638-425b-abf5-f47be24dd829	ac9fad73-e638-425b-abf5-f47be24dd829:arbitro@demo.com	2026-10-18 04:56:45.892
399b61bc-169e-43f2-99ea-19e11209882f	\N	rafael.pacheco@demo.com	\N	REFEREE_ASSIGNED	Tienes un partido asignado	Real Lorica vs Leones de Montería · dom, 11 de oct, 10:00 a. m. · Estadio Municipal de Montería. Confírmalo desde tu panel.	/panel/arbitro	f	fb81cfa9-02cc-4fcb-8a81-18a8914a6b6a	fb81cfa9-02cc-4fcb-8a81-18a8914a6b6a:rafael.pacheco@demo.com	2026-10-18 04:56:45.907
6baa4235-415f-42cb-bca5-906332df4c3e	\N	ana.beltran@demo.com	\N	REFEREE_ASSIGNED	Tienes un partido asignado	Atlético Cereté vs Halcones FC · dom, 11 de oct, 02:00 p. m. · Polideportivo del Sur. Confírmalo desde tu panel.	/panel/arbitro	f	f25dc275-06f6-4079-bd92-4bd68a87e4d7	f25dc275-06f6-4079-bd92-4bd68a87e4d7:ana.beltran@demo.com	2026-10-18 04:56:45.93
f77a8e50-f95c-4b9e-9e34-a0e6acffdb3a	\N	arbitro@demo.com	\N	REFEREE_ASSIGNED	Tienes un partido asignado	Deportivo La Ribera vs Leones de Montería · dom, 18 de oct, 08:00 a. m. · Estadio Municipal de Montería. Confírmalo desde tu panel.	/panel/arbitro	f	f3375304-5c8c-4f15-9b49-89cfcddcc00c	f3375304-5c8c-4f15-9b49-89cfcddcc00c:arbitro@demo.com	2026-10-18 04:56:45.942
0c3b9665-bc38-45c5-9562-8f62e9780d72	\N	ana.beltran@demo.com	\N	REFEREE_ASSIGNED	Tienes un partido asignado	Halcones FC vs Tigres del Sinú · dom, 18 de oct, 02:00 p. m. · Polideportivo del Sur. Confírmalo desde tu panel.	/panel/arbitro	f	ef724282-07c4-4144-ae9c-ab6a88465f9a	ef724282-07c4-4144-ae9c-ab6a88465f9a:ana.beltran@demo.com	2026-10-18 04:56:45.956
4bd4b45d-001c-4614-85ec-989e94b09d45	\N	ana.beltran@demo.com	\N	REFEREE_ASSIGNED	Tienes un partido asignado	Atlético Cereté vs Real Lorica · dom, 18 de oct, 04:00 p. m. · Polideportivo del Sur. Confírmalo desde tu panel.	/panel/arbitro	f	80bac687-d0d7-4ce0-83fb-f303f558ab93	80bac687-d0d7-4ce0-83fb-f303f558ab93:ana.beltran@demo.com	2026-10-18 04:56:45.972
6dce366b-79e3-496f-9d1f-3ba0271e0912	\N	rafael.pacheco@demo.com	\N	REFEREE_ASSIGNED	Tienes un partido asignado	Tigres del Sinú vs Leones de Montería · dom, 25 de oct, 08:00 a. m. · Estadio Municipal de Montería. Confírmalo desde tu panel.	/panel/arbitro	f	85b7f84f-3d38-4cd7-a176-c504ec7177b0	85b7f84f-3d38-4cd7-a176-c504ec7177b0:rafael.pacheco@demo.com	2026-10-18 04:56:45.986
851ca896-c458-4da8-9ee2-bc3a17c3ae72	\N	rafael.pacheco@demo.com	\N	REFEREE_ASSIGNED	Tienes un partido asignado	Deportivo La Ribera vs Atlético Cereté · dom, 25 de oct, 10:00 a. m. · Estadio Municipal de Montería. Confírmalo desde tu panel.	/panel/arbitro	f	5d720eef-5625-4a36-a8ad-d7131dbcd050	5d720eef-5625-4a36-a8ad-d7131dbcd050:rafael.pacheco@demo.com	2026-10-18 04:56:46
488acae4-de80-4668-b192-8266dab27327	\N	ana.beltran@demo.com	\N	REFEREE_ASSIGNED	Tienes un partido asignado	Halcones FC vs Real Lorica · dom, 25 de oct, 02:00 p. m. · Polideportivo del Sur. Confírmalo desde tu panel.	/panel/arbitro	f	436cb415-e154-420b-8ce2-1478abd838a3	436cb415-e154-420b-8ce2-1478abd838a3:ana.beltran@demo.com	2026-10-18 04:56:46.016
bcee7dd2-e9a1-439f-b371-98e72de82b66	\N	arbitro@demo.com	\N	REFEREE_ASSIGNED	Tienes un partido asignado	Leones de Montería vs Atlético Cereté · dom, 1 de nov, 08:00 a. m. · Estadio Municipal de Montería. Confírmalo desde tu panel.	/panel/arbitro	f	3b2be061-5997-4a8a-aac2-7a80e0eaff4a	3b2be061-5997-4a8a-aac2-7a80e0eaff4a:arbitro@demo.com	2026-10-18 04:56:46.031
9a250e79-5772-40f6-a3eb-c6ca02b73198	\N	ana.beltran@demo.com	\N	REFEREE_ASSIGNED	Tienes un partido asignado	Real Lorica vs Tigres del Sinú · dom, 1 de nov, 02:00 p. m. · Polideportivo del Sur. Confírmalo desde tu panel.	/panel/arbitro	f	0dfe5d93-4bcf-4348-909b-0767fc0ab386	0dfe5d93-4bcf-4348-909b-0767fc0ab386:ana.beltran@demo.com	2026-10-18 04:56:46.047
79243bb6-e4d4-4493-996b-43b6d05d9a5f	\N	ana.beltran@demo.com	\N	REFEREE_ASSIGNED	Tienes un partido asignado	Halcones FC vs Deportivo La Ribera · dom, 1 de nov, 04:00 p. m. · Polideportivo del Sur. Confírmalo desde tu panel.	/panel/arbitro	f	bea571c7-0ed8-4860-9dff-ef1a47af7020	bea571c7-0ed8-4860-9dff-ef1a47af7020:ana.beltran@demo.com	2026-10-18 04:56:46.06
db598899-9191-47e3-af00-7cae0a28d8a1	9028a3c8-0c76-4a94-be7a-77c358d5c054	\N	\N	MATCH_RESULT	Resultado final	Tigres del Sinú 0 - 0 Atlético Cereté	/partidos/3dd244e3-ef6b-4225-ba59-f62f891c27fe	f	982a0695-e9eb-40d2-bd0d-4c87a9570b37	982a0695-e9eb-40d2-bd0d-4c87a9570b37:9028a3c8-0c76-4a94-be7a-77c358d5c054	2026-10-18 04:56:50.051
3dd82c3d-ef30-4b91-9331-34697c45f77d	60ba64af-6f05-486b-9848-837b76bba8a0	\N	\N	MATCH_RESULT	Resultado final	Tigres del Sinú 0 - 0 Atlético Cereté	/partidos/3dd244e3-ef6b-4225-ba59-f62f891c27fe	f	982a0695-e9eb-40d2-bd0d-4c87a9570b37	982a0695-e9eb-40d2-bd0d-4c87a9570b37:60ba64af-6f05-486b-9848-837b76bba8a0	2026-10-18 04:56:50.051
4ff99394-e722-4051-ae7e-8db762827b3f	9028a3c8-0c76-4a94-be7a-77c358d5c054	\N	\N	MATCH_RESULT	Resultado final	Deportivo La Ribera 4 - 1 Real Lorica	/partidos/3b6c36ec-7a78-46e2-a22c-17cd14d8c9fe	f	3a8b82ac-e263-4ae8-8bbe-69f469a6ef66	3a8b82ac-e263-4ae8-8bbe-69f469a6ef66:9028a3c8-0c76-4a94-be7a-77c358d5c054	2026-10-18 04:56:50.472
b71d576b-a92b-43bf-a231-593582a624c2	60ba64af-6f05-486b-9848-837b76bba8a0	\N	\N	MATCH_RESULT	Resultado final	Deportivo La Ribera 4 - 1 Real Lorica	/partidos/3b6c36ec-7a78-46e2-a22c-17cd14d8c9fe	f	3a8b82ac-e263-4ae8-8bbe-69f469a6ef66	3a8b82ac-e263-4ae8-8bbe-69f469a6ef66:60ba64af-6f05-486b-9848-837b76bba8a0	2026-10-18 04:56:50.472
1b087dfe-9721-4fb9-8878-a4f7e301eef7	9028a3c8-0c76-4a94-be7a-77c358d5c054	\N	\N	MATCH_RESULT	Resultado final	Halcones FC 1 - 0 Leones de Montería	/partidos/b40b233f-98cf-4e05-a647-c3807b3cc065	f	afaa7237-a0f9-4268-af08-e8935fc6602d	afaa7237-a0f9-4268-af08-e8935fc6602d:9028a3c8-0c76-4a94-be7a-77c358d5c054	2026-10-18 04:56:50.887
e128e7c8-b1be-414c-864a-04ca7979a5a8	60ba64af-6f05-486b-9848-837b76bba8a0	\N	\N	MATCH_RESULT	Resultado final	Halcones FC 1 - 0 Leones de Montería	/partidos/b40b233f-98cf-4e05-a647-c3807b3cc065	f	afaa7237-a0f9-4268-af08-e8935fc6602d	afaa7237-a0f9-4268-af08-e8935fc6602d:60ba64af-6f05-486b-9848-837b76bba8a0	2026-10-18 04:56:50.887
1eb085f3-a81b-4f79-a7e0-13da868c6d9d	9028a3c8-0c76-4a94-be7a-77c358d5c054	\N	\N	MATCH_RESULT	Resultado final	Deportivo La Ribera 1 - 4 Tigres del Sinú	/partidos/34222df5-e8cf-4dcf-92fd-f76b6fd4fe03	f	25701d1e-2f1a-49b3-9383-57d9c1ff90c4	25701d1e-2f1a-49b3-9383-57d9c1ff90c4:9028a3c8-0c76-4a94-be7a-77c358d5c054	2026-10-18 04:56:51.197
49f7a4ca-b3e0-4b4f-849f-c48314302538	60ba64af-6f05-486b-9848-837b76bba8a0	\N	\N	MATCH_RESULT	Resultado final	Deportivo La Ribera 1 - 4 Tigres del Sinú	/partidos/34222df5-e8cf-4dcf-92fd-f76b6fd4fe03	f	25701d1e-2f1a-49b3-9383-57d9c1ff90c4	25701d1e-2f1a-49b3-9383-57d9c1ff90c4:60ba64af-6f05-486b-9848-837b76bba8a0	2026-10-18 04:56:51.197
20cb708f-b7a7-4b07-b375-7f7e5523db5a	9028a3c8-0c76-4a94-be7a-77c358d5c054	\N	\N	MATCH_RESULT	Resultado final	Leones de Montería 1 - 4 Real Lorica	/partidos/2536a233-32e7-466a-8502-3ec8e9384b62	f	44f86104-b12f-4169-98f5-49fcddf8b303	44f86104-b12f-4169-98f5-49fcddf8b303:9028a3c8-0c76-4a94-be7a-77c358d5c054	2026-10-18 04:56:51.567
b5fa2fc6-4960-4790-beab-c3a515b20b0b	60ba64af-6f05-486b-9848-837b76bba8a0	\N	\N	MATCH_RESULT	Resultado final	Leones de Montería 1 - 4 Real Lorica	/partidos/2536a233-32e7-466a-8502-3ec8e9384b62	f	44f86104-b12f-4169-98f5-49fcddf8b303	44f86104-b12f-4169-98f5-49fcddf8b303:60ba64af-6f05-486b-9848-837b76bba8a0	2026-10-18 04:56:51.567
381c8065-d6ff-4a36-a023-204dfd5757df	9028a3c8-0c76-4a94-be7a-77c358d5c054	\N	\N	MATCH_RESULT	Resultado final	Halcones FC 2 - 0 Atlético Cereté	/partidos/2b97a272-1b55-451d-9022-01e272625cf8	f	88c98049-8b48-4b2e-bc53-d58be11539ca	88c98049-8b48-4b2e-bc53-d58be11539ca:9028a3c8-0c76-4a94-be7a-77c358d5c054	2026-10-18 04:56:51.914
2a415472-3fd7-415a-9eb8-4e2dddd7e339	60ba64af-6f05-486b-9848-837b76bba8a0	\N	\N	MATCH_RESULT	Resultado final	Halcones FC 2 - 0 Atlético Cereté	/partidos/2b97a272-1b55-451d-9022-01e272625cf8	f	88c98049-8b48-4b2e-bc53-d58be11539ca	88c98049-8b48-4b2e-bc53-d58be11539ca:60ba64af-6f05-486b-9848-837b76bba8a0	2026-10-18 04:56:51.914
0df25f6f-d47e-4f6b-b0af-47fe33252ed5	9028a3c8-0c76-4a94-be7a-77c358d5c054	\N	\N	MATCH_RESULT	Resultado final	Tigres del Sinú 3 - 4 Halcones FC	/partidos/e1e91301-7504-4820-986e-29040622dd89	f	0168cee5-ae5a-44a2-be3a-a2c340227509	0168cee5-ae5a-44a2-be3a-a2c340227509:9028a3c8-0c76-4a94-be7a-77c358d5c054	2026-10-18 04:56:52.301
8b34cc6c-8b4c-449e-928a-089cd8ba12ec	60ba64af-6f05-486b-9848-837b76bba8a0	\N	\N	MATCH_RESULT	Resultado final	Tigres del Sinú 3 - 4 Halcones FC	/partidos/e1e91301-7504-4820-986e-29040622dd89	f	0168cee5-ae5a-44a2-be3a-a2c340227509	0168cee5-ae5a-44a2-be3a-a2c340227509:60ba64af-6f05-486b-9848-837b76bba8a0	2026-10-18 04:56:52.301
61c91704-4d20-4e84-8af1-d19f33ad7c30	9028a3c8-0c76-4a94-be7a-77c358d5c054	\N	\N	MATCH_RESULT	Resultado final	Real Lorica 1 - 0 Atlético Cereté	/partidos/f0ff8260-2d3b-4ebe-88d6-3f51c9d95d21	f	c10b9b7b-65ca-4fc8-ba68-d8d0c91ad7a3	c10b9b7b-65ca-4fc8-ba68-d8d0c91ad7a3:9028a3c8-0c76-4a94-be7a-77c358d5c054	2026-10-18 04:56:52.523
992c2ed3-534a-489e-ad33-581ab8cfd36c	60ba64af-6f05-486b-9848-837b76bba8a0	\N	\N	MATCH_RESULT	Resultado final	Real Lorica 1 - 0 Atlético Cereté	/partidos/f0ff8260-2d3b-4ebe-88d6-3f51c9d95d21	f	c10b9b7b-65ca-4fc8-ba68-d8d0c91ad7a3	c10b9b7b-65ca-4fc8-ba68-d8d0c91ad7a3:60ba64af-6f05-486b-9848-837b76bba8a0	2026-10-18 04:56:52.523
97f9cb41-222d-471c-adc4-70585c3acaf1	9028a3c8-0c76-4a94-be7a-77c358d5c054	\N	\N	MATCH_RESULT	Resultado final	Leones de Montería 0 - 4 Deportivo La Ribera	/partidos/4f894014-0d98-43fe-ab89-74ccf59fedaa	f	aa7c1042-e4b4-4866-8c4b-141bb26c87c2	aa7c1042-e4b4-4866-8c4b-141bb26c87c2:9028a3c8-0c76-4a94-be7a-77c358d5c054	2026-10-18 04:56:52.801
3e9b8d31-574f-472f-bfa3-26c7e8a8914c	60ba64af-6f05-486b-9848-837b76bba8a0	\N	\N	MATCH_RESULT	Resultado final	Leones de Montería 0 - 4 Deportivo La Ribera	/partidos/4f894014-0d98-43fe-ab89-74ccf59fedaa	f	aa7c1042-e4b4-4866-8c4b-141bb26c87c2	aa7c1042-e4b4-4866-8c4b-141bb26c87c2:60ba64af-6f05-486b-9848-837b76bba8a0	2026-10-18 04:56:52.801
3617b718-f3a5-4990-8b18-bb41a59c9aa6	9028a3c8-0c76-4a94-be7a-77c358d5c054	\N	\N	MATCH_RESULT	Resultado final	Real Lorica 1 - 0 Halcones FC	/partidos/83d718aa-15a5-4edd-80f8-dd9ba7e95a19	f	cef7f775-bcce-4baf-9114-9280d946ef96	cef7f775-bcce-4baf-9114-9280d946ef96:9028a3c8-0c76-4a94-be7a-77c358d5c054	2026-10-18 04:56:53
1d7ec9b3-3b77-420f-aedf-a21e3a21e6bb	60ba64af-6f05-486b-9848-837b76bba8a0	\N	\N	MATCH_RESULT	Resultado final	Real Lorica 1 - 0 Halcones FC	/partidos/83d718aa-15a5-4edd-80f8-dd9ba7e95a19	f	cef7f775-bcce-4baf-9114-9280d946ef96	cef7f775-bcce-4baf-9114-9280d946ef96:60ba64af-6f05-486b-9848-837b76bba8a0	2026-10-18 04:56:53
2f1e2d0b-0c6b-4c0f-be6e-4cde9aa934a6	9028a3c8-0c76-4a94-be7a-77c358d5c054	\N	\N	MATCH_RESULT	Resultado final	Leones de Montería 0 - 1 Tigres del Sinú	/partidos/37db5eaa-58b3-4399-bd35-33772bb93e66	f	2e912750-a778-42c4-98e3-35c6a3f24c6c	2e912750-a778-42c4-98e3-35c6a3f24c6c:9028a3c8-0c76-4a94-be7a-77c358d5c054	2026-10-18 04:56:53.207
896a6110-79ca-4984-a162-ac9fd615c50c	60ba64af-6f05-486b-9848-837b76bba8a0	\N	\N	MATCH_RESULT	Resultado final	Leones de Montería 0 - 1 Tigres del Sinú	/partidos/37db5eaa-58b3-4399-bd35-33772bb93e66	f	2e912750-a778-42c4-98e3-35c6a3f24c6c	2e912750-a778-42c4-98e3-35c6a3f24c6c:60ba64af-6f05-486b-9848-837b76bba8a0	2026-10-18 04:56:53.207
ee85dfb7-2a81-415b-8a76-aa8742a09300	9028a3c8-0c76-4a94-be7a-77c358d5c054	\N	\N	MATCH_RESULT	Resultado final	Atlético Cereté 2 - 0 Deportivo La Ribera	/partidos/cbb9288f-5afd-4f6c-9221-0b04d341b35e	f	0e33c050-f399-49d5-8ced-c36d7a3098e8	0e33c050-f399-49d5-8ced-c36d7a3098e8:9028a3c8-0c76-4a94-be7a-77c358d5c054	2026-10-18 04:56:53.45
fe881546-47ae-4907-9c74-324e649bdda2	60ba64af-6f05-486b-9848-837b76bba8a0	\N	\N	MATCH_RESULT	Resultado final	Atlético Cereté 2 - 0 Deportivo La Ribera	/partidos/cbb9288f-5afd-4f6c-9221-0b04d341b35e	f	0e33c050-f399-49d5-8ced-c36d7a3098e8	0e33c050-f399-49d5-8ced-c36d7a3098e8:60ba64af-6f05-486b-9848-837b76bba8a0	2026-10-18 04:56:53.45
d2ac7870-48bb-4926-9969-a96049492eb7	9028a3c8-0c76-4a94-be7a-77c358d5c054	\N	\N	MATCH_RESULT	Resultado final	Tigres del Sinú 3 - 4 Real Lorica	/partidos/ef191efe-87e4-4c8b-a584-beb441524949	f	e1ea9833-e9fc-4c9d-b2a8-44c8e15b2711	e1ea9833-e9fc-4c9d-b2a8-44c8e15b2711:9028a3c8-0c76-4a94-be7a-77c358d5c054	2026-10-18 04:56:53.864
71ab170d-a371-431f-aa33-c974374e90af	60ba64af-6f05-486b-9848-837b76bba8a0	\N	\N	MATCH_RESULT	Resultado final	Tigres del Sinú 3 - 4 Real Lorica	/partidos/ef191efe-87e4-4c8b-a584-beb441524949	f	e1ea9833-e9fc-4c9d-b2a8-44c8e15b2711	e1ea9833-e9fc-4c9d-b2a8-44c8e15b2711:60ba64af-6f05-486b-9848-837b76bba8a0	2026-10-18 04:56:53.864
f08c0744-f73e-45a3-94e9-dfb48032752d	9028a3c8-0c76-4a94-be7a-77c358d5c054	\N	\N	MATCH_RESULT	Resultado final	Deportivo La Ribera 1 - 0 Halcones FC	/partidos/44360032-7dc3-4a0c-8671-3d39f4ff0fa0	f	fbf967af-1215-4d9f-b106-afc6dfcf7892	fbf967af-1215-4d9f-b106-afc6dfcf7892:9028a3c8-0c76-4a94-be7a-77c358d5c054	2026-10-18 04:56:54.076
9257b2a5-646f-4e99-838f-9289b84662f3	60ba64af-6f05-486b-9848-837b76bba8a0	\N	\N	MATCH_RESULT	Resultado final	Deportivo La Ribera 1 - 0 Halcones FC	/partidos/44360032-7dc3-4a0c-8671-3d39f4ff0fa0	f	fbf967af-1215-4d9f-b106-afc6dfcf7892	fbf967af-1215-4d9f-b106-afc6dfcf7892:60ba64af-6f05-486b-9848-837b76bba8a0	2026-10-18 04:56:54.076
da716a9f-295e-459c-9b5b-160920ae8e75	9028a3c8-0c76-4a94-be7a-77c358d5c054	\N	\N	MATCH_RESULT	Resultado final	Atlético Cereté 1 - 1 Leones de Montería	/partidos/476c3367-2714-4b80-a91b-bd2c55f065ba	f	a60d4c22-8ad3-4332-8eae-3d9ea8c762c6	a60d4c22-8ad3-4332-8eae-3d9ea8c762c6:9028a3c8-0c76-4a94-be7a-77c358d5c054	2026-10-18 04:56:54.278
21f0cd2c-5813-42ff-b843-9ef2fd2c3770	60ba64af-6f05-486b-9848-837b76bba8a0	\N	\N	MATCH_RESULT	Resultado final	Atlético Cereté 1 - 1 Leones de Montería	/partidos/476c3367-2714-4b80-a91b-bd2c55f065ba	f	a60d4c22-8ad3-4332-8eae-3d9ea8c762c6	a60d4c22-8ad3-4332-8eae-3d9ea8c762c6:60ba64af-6f05-486b-9848-837b76bba8a0	2026-10-18 04:56:54.278
b4294923-ee6c-4f22-b888-ce54c7991c1f	9028a3c8-0c76-4a94-be7a-77c358d5c054	\N	\N	MATCH_RESULT	Resultado final	Real Lorica 3 - 1 Deportivo La Ribera	/partidos/fe59007e-5085-4e44-a247-4dedb49fd4a4	f	aae6dd0b-b5bd-4f16-ab7e-e978ff7e96d8	aae6dd0b-b5bd-4f16-ab7e-e978ff7e96d8:9028a3c8-0c76-4a94-be7a-77c358d5c054	2026-10-18 04:56:54.594
b27c2fb5-d8f5-484d-bd18-e10be352d9f7	60ba64af-6f05-486b-9848-837b76bba8a0	\N	\N	MATCH_RESULT	Resultado final	Real Lorica 3 - 1 Deportivo La Ribera	/partidos/fe59007e-5085-4e44-a247-4dedb49fd4a4	f	aae6dd0b-b5bd-4f16-ab7e-e978ff7e96d8	aae6dd0b-b5bd-4f16-ab7e-e978ff7e96d8:60ba64af-6f05-486b-9848-837b76bba8a0	2026-10-18 04:56:54.594
e7a71396-4d27-4568-9d45-69172f200cc1	9028a3c8-0c76-4a94-be7a-77c358d5c054	\N	\N	MATCH_RESULT	Resultado final	Atlético Cereté 0 - 1 Tigres del Sinú	/partidos/e75a2f51-6996-482f-9aa8-13e29708b8d6	f	93779c02-d180-4fbd-b3d3-b8e95aec7449	93779c02-d180-4fbd-b3d3-b8e95aec7449:9028a3c8-0c76-4a94-be7a-77c358d5c054	2026-10-18 04:56:54.757
d31b40da-28c0-48b5-8be2-4036e9899d4d	60ba64af-6f05-486b-9848-837b76bba8a0	\N	\N	MATCH_RESULT	Resultado final	Atlético Cereté 0 - 1 Tigres del Sinú	/partidos/e75a2f51-6996-482f-9aa8-13e29708b8d6	f	93779c02-d180-4fbd-b3d3-b8e95aec7449	93779c02-d180-4fbd-b3d3-b8e95aec7449:60ba64af-6f05-486b-9848-837b76bba8a0	2026-10-18 04:56:54.757
179fc894-91a9-4cf6-9e61-b60243dec7b2	9028a3c8-0c76-4a94-be7a-77c358d5c054	\N	\N	MATCH_RESULT	Resultado final	Leones de Montería 2 - 1 Halcones FC	/partidos/02b841ad-bd49-4190-a9ad-4cc4cf2a0be8	f	6200b479-4016-4cba-8b84-bb13232929e0	6200b479-4016-4cba-8b84-bb13232929e0:9028a3c8-0c76-4a94-be7a-77c358d5c054	2026-10-18 04:56:54.993
e6794173-e6bc-4bc6-a2c6-665465d2caf0	60ba64af-6f05-486b-9848-837b76bba8a0	\N	\N	MATCH_RESULT	Resultado final	Leones de Montería 2 - 1 Halcones FC	/partidos/02b841ad-bd49-4190-a9ad-4cc4cf2a0be8	f	6200b479-4016-4cba-8b84-bb13232929e0	6200b479-4016-4cba-8b84-bb13232929e0:60ba64af-6f05-486b-9848-837b76bba8a0	2026-10-18 04:56:54.993
9977f215-4d85-4c3f-be53-1b0fb47b4ab0	9028a3c8-0c76-4a94-be7a-77c358d5c054	\N	\N	MATCH_RESULT	Resultado final	Tigres del Sinú 2 - 1 Deportivo La Ribera	/partidos/2048d71d-46a6-496c-86f3-8ff8f8f33b4f	f	49566b4b-48c9-42c6-b1e5-bcc78c60b05f	49566b4b-48c9-42c6-b1e5-bcc78c60b05f:9028a3c8-0c76-4a94-be7a-77c358d5c054	2026-10-18 04:56:55.212
3b9ae509-057a-47b7-98be-81d440cb7208	60ba64af-6f05-486b-9848-837b76bba8a0	\N	\N	MATCH_RESULT	Resultado final	Tigres del Sinú 2 - 1 Deportivo La Ribera	/partidos/2048d71d-46a6-496c-86f3-8ff8f8f33b4f	f	49566b4b-48c9-42c6-b1e5-bcc78c60b05f	49566b4b-48c9-42c6-b1e5-bcc78c60b05f:60ba64af-6f05-486b-9848-837b76bba8a0	2026-10-18 04:56:55.212
df1febd3-c252-4fb9-b5f4-604400e0e90b	9028a3c8-0c76-4a94-be7a-77c358d5c054	\N	\N	MATCH_RESULT	Resultado final	Real Lorica 1 - 1 Leones de Montería	/partidos/7f654794-9b0e-4b28-93e9-e6c1259ffec5	f	78489da7-b6c0-498e-b298-376c0419a701	78489da7-b6c0-498e-b298-376c0419a701:9028a3c8-0c76-4a94-be7a-77c358d5c054	2026-10-18 04:56:55.461
801a0108-a480-414a-bd30-b46ce046a302	60ba64af-6f05-486b-9848-837b76bba8a0	\N	\N	MATCH_RESULT	Resultado final	Real Lorica 1 - 1 Leones de Montería	/partidos/7f654794-9b0e-4b28-93e9-e6c1259ffec5	f	78489da7-b6c0-498e-b298-376c0419a701	78489da7-b6c0-498e-b298-376c0419a701:60ba64af-6f05-486b-9848-837b76bba8a0	2026-10-18 04:56:55.461
2af1c06a-eec7-46bc-855b-da27f2ee54c2	9028a3c8-0c76-4a94-be7a-77c358d5c054	\N	\N	MATCH_SUSPENDED	Partido suspendido	Deportivo La Ribera vs Leones de Montería: Cancha en mantenimiento por lluvias	/partidos/497cfd9a-7aae-438f-befa-83471be8a993	f	b05181bd-28da-41fe-8da8-5d11c55a9e48	b05181bd-28da-41fe-8da8-5d11c55a9e48:9028a3c8-0c76-4a94-be7a-77c358d5c054	2026-10-18 04:56:55.604
01edf318-a8b0-4427-b4d5-a87673ef25ff	60ba64af-6f05-486b-9848-837b76bba8a0	\N	\N	MATCH_SUSPENDED	Partido suspendido	Deportivo La Ribera vs Leones de Montería: Cancha en mantenimiento por lluvias	/partidos/497cfd9a-7aae-438f-befa-83471be8a993	f	b05181bd-28da-41fe-8da8-5d11c55a9e48	b05181bd-28da-41fe-8da8-5d11c55a9e48:60ba64af-6f05-486b-9848-837b76bba8a0	2026-10-18 04:56:55.604
b3014283-ff27-4939-870a-5a065a2bbcbf	9028a3c8-0c76-4a94-be7a-77c358d5c054	\N	\N	MATCH_RESCHEDULED	Cambio de horario	Halcones FC vs Tigres del Sinú: ahora dom, 18 de oct, 02:00 p. m. en Polideportivo del Sur.	/partidos/0aa25d72-0cab-41b9-a347-aa78632c386a	f	a7d18801-90ef-4fa6-aa62-fd26ebdf515c	a7d18801-90ef-4fa6-aa62-fd26ebdf515c:9028a3c8-0c76-4a94-be7a-77c358d5c054	2026-10-18 04:56:55.654
8d9aec76-8a9a-4a18-bc9c-b127c6ad0085	60ba64af-6f05-486b-9848-837b76bba8a0	\N	\N	MATCH_RESCHEDULED	Cambio de horario	Halcones FC vs Tigres del Sinú: ahora dom, 18 de oct, 02:00 p. m. en Polideportivo del Sur.	/partidos/0aa25d72-0cab-41b9-a347-aa78632c386a	f	a7d18801-90ef-4fa6-aa62-fd26ebdf515c	a7d18801-90ef-4fa6-aa62-fd26ebdf515c:60ba64af-6f05-486b-9848-837b76bba8a0	2026-10-18 04:56:55.654
6ffe2834-9854-41d4-91a2-65351110e3d1	\N	\N	ADMIN	USER_REGISTERED	Nuevo usuario registrado	Sofía Martínez (organizadora@demo.com) se registró como organizador.	/admin?tab=usuarios	f	200e9da6-a086-422f-abad-5f49c8de5a85	200e9da6-a086-422f-abad-5f49c8de5a85:ADMIN	2026-10-18 04:56:55.827
2c4b1a63-5dc0-40bf-8afe-031bb4ec3f48	\N	\N	ADMIN	LEAGUE_PENDING	Nueva liga pendiente de aprobación	Sofía Martínez creó la liga "Liga Femenina de Vóley Cereté". Revísala para autorizarla.	/admin?tab=ligas	f	62ef98b8-0de6-499e-b021-137a4b6d1ffa	62ef98b8-0de6-499e-b021-137a4b6d1ffa:ADMIN	2026-10-18 04:56:55.842
80604169-33e6-4603-8d04-08f9e88a43cd	\N	\N	ADMIN	LEAGUE_PENDING	Nueva liga pendiente de aprobación	Sofía Martínez creó la liga "Torneo Relámpago de Básquet Sahagún". Revísala para autorizarla.	/admin?tab=ligas	f	b10c094d-24bb-4afc-aa6b-c9ca327946af	b10c094d-24bb-4afc-aa6b-c9ca327946af:ADMIN	2026-10-18 04:56:55.862
\.


--
-- Data for Name: preferences; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.preferences (user_id, email_enabled, push_enabled, updated_at) FROM stdin;
\.


--
-- Data for Name: push_subscriptions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.push_subscriptions (id, user_id, endpoint, p256dh, auth, user_agent, created_at) FROM stdin;
\.


--
-- Data for Name: subscriptions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.subscriptions (id, user_id, email, league_id, created_at) FROM stdin;
378a2dea-cf60-4fb1-b8e2-3f6e53f32a94	60ba64af-6f05-486b-9848-837b76bba8a0	aficionado@demo.com	b7316ac3-ba86-4eec-acbd-1c0f125c5580	2026-10-18 04:56:45.184
\.


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: deliveries deliveries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deliveries
    ADD CONSTRAINT deliveries_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: preferences preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.preferences
    ADD CONSTRAINT preferences_pkey PRIMARY KEY (user_id);


--
-- Name: push_subscriptions push_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);


--
-- Name: deliveries_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX deliveries_created_at_idx ON public.deliveries USING btree (created_at);


--
-- Name: notifications_dedupe_key_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX notifications_dedupe_key_key ON public.notifications USING btree (dedupe_key);


--
-- Name: notifications_email_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notifications_email_idx ON public.notifications USING btree (email);


--
-- Name: notifications_role_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notifications_role_idx ON public.notifications USING btree (role);


--
-- Name: notifications_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notifications_user_id_idx ON public.notifications USING btree (user_id);


--
-- Name: push_subscriptions_endpoint_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX push_subscriptions_endpoint_key ON public.push_subscriptions USING btree (endpoint);


--
-- Name: push_subscriptions_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX push_subscriptions_user_id_idx ON public.push_subscriptions USING btree (user_id);


--
-- Name: subscriptions_league_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX subscriptions_league_id_idx ON public.subscriptions USING btree (league_id);


--
-- Name: subscriptions_user_id_league_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX subscriptions_user_id_league_id_key ON public.subscriptions USING btree (user_id, league_id);


--
-- PostgreSQL database dump complete
--

\unrestrict EMOIxKGdzbeUDseUvJYSepe5I6nm3wBtXsDZ7DaufK4jL8LFryLiU1BLHffRqfG

