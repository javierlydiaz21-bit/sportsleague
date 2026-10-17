--
-- PostgreSQL database dump
--

\restrict Dt4ec0Pz4f1B6OJ2NhizkOLhvPTNJ7p4WHwKGqIKqelW47PTes20xbi3yJgn1u5

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
DROP INDEX IF EXISTS public.notifications_user_id_idx;
DROP INDEX IF EXISTS public.notifications_role_idx;
DROP INDEX IF EXISTS public.notifications_email_idx;
DROP INDEX IF EXISTS public.notifications_dedupe_key_key;
DROP INDEX IF EXISTS public.deliveries_created_at_idx;
ALTER TABLE IF EXISTS ONLY public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_pkey;
ALTER TABLE IF EXISTS ONLY public.preferences DROP CONSTRAINT IF EXISTS preferences_pkey;
ALTER TABLE IF EXISTS ONLY public.notifications DROP CONSTRAINT IF EXISTS notifications_pkey;
ALTER TABLE IF EXISTS ONLY public.deliveries DROP CONSTRAINT IF EXISTS deliveries_pkey;
ALTER TABLE IF EXISTS ONLY public._prisma_migrations DROP CONSTRAINT IF EXISTS _prisma_migrations_pkey;
DROP TABLE IF EXISTS public.subscriptions;
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
291cd01c-0aac-4db0-8109-a36aa4ceb4ef	28d690da2c272f7cca051277508053be31563ef60a1ae8b1a16b26f948b1b4e7	2026-10-17 15:57:51.519438+00	20261011000000_init	\N	\N	2026-10-17 15:57:51.255342+00	1
\.


--
-- Data for Name: deliveries; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.deliveries (id, channel, recipient, subject, status, created_at) FROM stdin;
e6a3809b-9853-4e68-a105-7a0175c5a2c7	PUSH	ab7d9b35-97b6-4e00-b17e-ab915cd51696	Tu liga fue aprobada	SIMULATED	2026-10-17 15:58:03.722
2b183c77-e61e-4603-a422-09fa8babe339	EMAIL	aficionado@demo.com	Jornada 1 programada	SIMULATED	2026-10-17 15:58:05.617
072ec29e-f7b2-4f61-a025-e6e2aacbeb04	PUSH	ab7d9b35-97b6-4e00-b17e-ab915cd51696	Jornada 1 programada	SIMULATED	2026-10-17 15:58:05.617
d8cf2410-53fc-434c-88d2-a9a190ec8c10	PUSH	cae1ef7a-182a-4de8-be5c-28ff8888cabc	Jornada 1 programada	SIMULATED	2026-10-17 15:58:05.617
65d42686-81a8-4c33-b70b-1c3b4d6cf10a	EMAIL	aficionado@demo.com	Jornada 2 programada	SIMULATED	2026-10-17 15:58:05.638
7816dc7b-e056-4709-a4dd-cc12613bd8b5	PUSH	ab7d9b35-97b6-4e00-b17e-ab915cd51696	Jornada 2 programada	SIMULATED	2026-10-17 15:58:05.638
b28a0426-b8f8-4f51-95a3-c63308d707b5	PUSH	cae1ef7a-182a-4de8-be5c-28ff8888cabc	Jornada 2 programada	SIMULATED	2026-10-17 15:58:05.638
99393c1e-a42e-4c84-99d1-4a3c40794c4a	EMAIL	aficionado@demo.com	Jornada 3 programada	SIMULATED	2026-10-17 15:58:05.683
aa3f8ce8-80de-4fb9-a5d8-79bea3a69951	PUSH	ab7d9b35-97b6-4e00-b17e-ab915cd51696	Jornada 3 programada	SIMULATED	2026-10-17 15:58:05.683
037b8389-3e4e-42c7-9afe-718ab011c76a	PUSH	cae1ef7a-182a-4de8-be5c-28ff8888cabc	Jornada 3 programada	SIMULATED	2026-10-17 15:58:05.683
898e9f94-5bfe-42ec-86e7-cef233c8bc57	EMAIL	aficionado@demo.com	Jornada 4 programada	SIMULATED	2026-10-17 15:58:05.708
fb0f6825-3e30-4ce9-ba91-ccac226c44ab	PUSH	ab7d9b35-97b6-4e00-b17e-ab915cd51696	Jornada 4 programada	SIMULATED	2026-10-17 15:58:05.708
2c86f4ae-d838-4a67-80bf-c7c229084ac8	PUSH	cae1ef7a-182a-4de8-be5c-28ff8888cabc	Jornada 4 programada	SIMULATED	2026-10-17 15:58:05.708
ac063445-4439-4e84-9fb0-e6b5b4fdc59d	EMAIL	arbitro@demo.com	Tienes un partido asignado	SIMULATED	2026-10-17 15:58:05.73
4810554b-32db-4ec0-a2b1-62befae00476	EMAIL	aficionado@demo.com	Jornada 5 programada	SIMULATED	2026-10-17 15:58:05.766
4464f701-2de7-4e36-a41e-f3e08a906748	PUSH	ab7d9b35-97b6-4e00-b17e-ab915cd51696	Jornada 5 programada	SIMULATED	2026-10-17 15:58:05.766
c1160c07-0fe8-47f8-83ef-0050e9edff89	PUSH	cae1ef7a-182a-4de8-be5c-28ff8888cabc	Jornada 5 programada	SIMULATED	2026-10-17 15:58:05.766
bf8053e5-0b19-419e-ab13-da38676f8262	EMAIL	ana.beltran@demo.com	Tienes un partido asignado	SIMULATED	2026-10-17 15:58:05.77
81c1a475-31ee-4f84-9bd2-37b5854af317	EMAIL	aficionado@demo.com	Jornada 6 programada	SIMULATED	2026-10-17 15:58:05.784
6505fb4f-532b-4e54-b693-dc9412012c67	PUSH	ab7d9b35-97b6-4e00-b17e-ab915cd51696	Jornada 6 programada	SIMULATED	2026-10-17 15:58:05.784
b1059122-c85b-4346-8a2c-e7ffad1f6d83	PUSH	cae1ef7a-182a-4de8-be5c-28ff8888cabc	Jornada 6 programada	SIMULATED	2026-10-17 15:58:05.784
044dfdff-075a-4f9f-b9f4-39ec92c91347	EMAIL	aficionado@demo.com	Jornada 7 programada	SIMULATED	2026-10-17 15:58:05.804
c28c15f4-741d-4c4d-9bd0-79ffa3edf150	PUSH	ab7d9b35-97b6-4e00-b17e-ab915cd51696	Jornada 7 programada	SIMULATED	2026-10-17 15:58:05.804
9df1ac32-3b66-4491-9e08-44bb48847e4c	PUSH	cae1ef7a-182a-4de8-be5c-28ff8888cabc	Jornada 7 programada	SIMULATED	2026-10-17 15:58:05.804
ccd5a86f-3513-4b48-907c-cdfbe04d6673	EMAIL	ana.beltran@demo.com	Tienes un partido asignado	SIMULATED	2026-10-17 15:58:05.812
a33a9394-f363-4377-b99e-bf9c3380062e	EMAIL	aficionado@demo.com	Jornada 8 programada	SIMULATED	2026-10-17 15:58:05.819
5a7f4184-e831-4d18-8ca0-6c1221142ae1	PUSH	ab7d9b35-97b6-4e00-b17e-ab915cd51696	Jornada 8 programada	SIMULATED	2026-10-17 15:58:05.819
c0bcbb60-6cdf-4b7a-9da8-3314e66b6ae8	PUSH	cae1ef7a-182a-4de8-be5c-28ff8888cabc	Jornada 8 programada	SIMULATED	2026-10-17 15:58:05.819
d5f151cb-37a8-405a-b711-2aad97bd4cbe	EMAIL	aficionado@demo.com	Jornada 9 programada	SIMULATED	2026-10-17 15:58:05.842
51df1d32-c2cd-4a3f-b9a5-373aa8e50fd4	PUSH	ab7d9b35-97b6-4e00-b17e-ab915cd51696	Jornada 9 programada	SIMULATED	2026-10-17 15:58:05.842
2a596c8a-4e81-4867-bf5c-f477d528ef8f	PUSH	cae1ef7a-182a-4de8-be5c-28ff8888cabc	Jornada 9 programada	SIMULATED	2026-10-17 15:58:05.842
f2349900-cc78-4458-b8e9-dfd97c589873	EMAIL	aficionado@demo.com	Jornada 10 programada	SIMULATED	2026-10-17 15:58:05.858
4780ff63-7285-409a-aed6-dd4f9c2d7626	PUSH	ab7d9b35-97b6-4e00-b17e-ab915cd51696	Jornada 10 programada	SIMULATED	2026-10-17 15:58:05.858
6a94d612-8451-48ad-b365-fe37c5fd1f72	PUSH	cae1ef7a-182a-4de8-be5c-28ff8888cabc	Jornada 10 programada	SIMULATED	2026-10-17 15:58:05.858
222c72d2-6b26-4082-8767-20a27717db75	EMAIL	rafael.pacheco@demo.com	Tienes un partido asignado	SIMULATED	2026-10-17 15:58:05.866
ac14a1c8-2084-40bb-adca-30848bdd2755	EMAIL	arbitro@demo.com	Tienes un partido asignado	SIMULATED	2026-10-17 15:58:05.896
939a1514-c1dd-441f-9ade-c6c85f65c5a8	EMAIL	ana.beltran@demo.com	Tienes un partido asignado	SIMULATED	2026-10-17 15:58:05.942
df1d42b9-160e-4f62-8582-85ab65203217	EMAIL	rafael.pacheco@demo.com	Tienes un partido asignado	SIMULATED	2026-10-17 15:58:05.988
9cb98b15-b7ed-4298-8ead-61836ff9439e	EMAIL	arbitro@demo.com	Tienes un partido asignado	SIMULATED	2026-10-17 15:58:06.026
725f31c5-f33a-4fd4-9f67-e9323625748d	EMAIL	ana.beltran@demo.com	Tienes un partido asignado	SIMULATED	2026-10-17 15:58:06.047
a591eacc-4a67-4c9a-8145-7887e4b1b063	EMAIL	rafael.pacheco@demo.com	Tienes un partido asignado	SIMULATED	2026-10-17 15:58:06.064
7983a8f3-9cf8-47dd-8db2-f97822df943a	EMAIL	ana.beltran@demo.com	Tienes un partido asignado	SIMULATED	2026-10-17 15:58:06.082
4d2f6d39-b3eb-4fe3-b383-02199a70aff0	EMAIL	ana.beltran@demo.com	Tienes un partido asignado	SIMULATED	2026-10-17 15:58:06.099
8b544469-8828-4450-86eb-ddd55ebe0a68	EMAIL	arbitro@demo.com	Tienes un partido asignado	SIMULATED	2026-10-17 15:58:06.119
bd065922-a473-44a2-8bb4-b7b2737d0324	EMAIL	rafael.pacheco@demo.com	Tienes un partido asignado	SIMULATED	2026-10-17 15:58:06.141
8a1afe21-8117-4805-865c-31c05e62ce3b	EMAIL	ana.beltran@demo.com	Tienes un partido asignado	SIMULATED	2026-10-17 15:58:06.167
ceb173b3-fa9b-463c-8fe1-cb5a779a05dc	EMAIL	arbitro@demo.com	Tienes un partido asignado	SIMULATED	2026-10-17 15:58:06.187
20bc836a-4956-4b12-ae7a-3caa1196061e	EMAIL	ana.beltran@demo.com	Tienes un partido asignado	SIMULATED	2026-10-17 15:58:06.205
befdcd63-9ef0-4a36-b1a4-5e7b5867decf	EMAIL	ana.beltran@demo.com	Tienes un partido asignado	SIMULATED	2026-10-17 15:58:06.228
0dd876cf-65ae-438d-a66d-9a6d4b73168f	EMAIL	arbitro@demo.com	Tienes un partido asignado	SIMULATED	2026-10-17 15:58:06.247
5bc82cbb-067e-42fe-8d46-fe898be960f0	EMAIL	rafael.pacheco@demo.com	Tienes un partido asignado	SIMULATED	2026-10-17 15:58:06.265
3c10fe21-df0e-4439-89b9-6b71ada8fc4e	EMAIL	ana.beltran@demo.com	Tienes un partido asignado	SIMULATED	2026-10-17 15:58:06.284
1f0ec878-ee9a-445b-86a2-9faa2db8d533	EMAIL	arbitro@demo.com	Tienes un partido asignado	SIMULATED	2026-10-17 15:58:06.303
10af7ece-670e-4d57-9761-3c86d671f336	EMAIL	ana.beltran@demo.com	Tienes un partido asignado	SIMULATED	2026-10-17 15:58:06.321
3c5b80a9-4e4b-45fe-9cce-879c9a4e709b	EMAIL	ana.beltran@demo.com	Tienes un partido asignado	SIMULATED	2026-10-17 15:58:06.341
e6cf3975-3c58-42a4-aee8-b813ac68f4fe	EMAIL	rafael.pacheco@demo.com	Tienes un partido asignado	SIMULATED	2026-10-17 15:58:06.362
b1671b67-210f-4f32-9fd1-a231b0a6c111	EMAIL	rafael.pacheco@demo.com	Tienes un partido asignado	SIMULATED	2026-10-17 15:58:06.38
b811a353-685a-4980-88d0-1aea193a70bb	EMAIL	ana.beltran@demo.com	Tienes un partido asignado	SIMULATED	2026-10-17 15:58:06.397
e8856a59-6cee-45e0-9c29-62634ad9e8b3	EMAIL	arbitro@demo.com	Tienes un partido asignado	SIMULATED	2026-10-17 15:58:06.415
26d4db63-633e-458e-9344-e15f4aaad1e8	EMAIL	ana.beltran@demo.com	Tienes un partido asignado	SIMULATED	2026-10-17 15:58:06.439
b20f4ebe-74fe-4670-8617-f0ab53ab921e	EMAIL	ana.beltran@demo.com	Tienes un partido asignado	SIMULATED	2026-10-17 15:58:06.467
28b9550a-abc7-4b2f-b4aa-da69c2131eed	EMAIL	aficionado@demo.com	Resultado final	SIMULATED	2026-10-17 15:58:10.129
06b1605a-6009-4a49-8d82-d2c53af62163	PUSH	ab7d9b35-97b6-4e00-b17e-ab915cd51696	Resultado final	SIMULATED	2026-10-17 15:58:10.129
0091c8a2-b7ed-40c3-a7e3-f9b781fd9463	PUSH	cae1ef7a-182a-4de8-be5c-28ff8888cabc	Resultado final	SIMULATED	2026-10-17 15:58:10.129
44f00bea-ccae-4a88-b08a-8a77f37907e7	EMAIL	aficionado@demo.com	Resultado final	SIMULATED	2026-10-17 15:58:10.412
f44c44bd-e784-4983-8cf5-e586ae3fe546	PUSH	ab7d9b35-97b6-4e00-b17e-ab915cd51696	Resultado final	SIMULATED	2026-10-17 15:58:10.412
96a94189-d658-4a77-b373-dbcf23ca04a0	PUSH	cae1ef7a-182a-4de8-be5c-28ff8888cabc	Resultado final	SIMULATED	2026-10-17 15:58:10.412
62e30ae6-b967-4bf5-8b2f-237c5c4412d3	EMAIL	aficionado@demo.com	Resultado final	SIMULATED	2026-10-17 15:58:10.682
1915da28-d950-479d-b843-3838faefdc11	PUSH	ab7d9b35-97b6-4e00-b17e-ab915cd51696	Resultado final	SIMULATED	2026-10-17 15:58:10.682
7ac0d944-6338-4c93-b294-012fce8157b8	PUSH	cae1ef7a-182a-4de8-be5c-28ff8888cabc	Resultado final	SIMULATED	2026-10-17 15:58:10.682
96796f87-9a0b-4c8a-ad9f-7b076386495c	EMAIL	aficionado@demo.com	Resultado final	SIMULATED	2026-10-17 15:58:10.977
fa49453f-8df2-4353-8e27-9254f9dce0bb	PUSH	ab7d9b35-97b6-4e00-b17e-ab915cd51696	Resultado final	SIMULATED	2026-10-17 15:58:10.977
0211f073-a79b-4d59-8a89-1c1804f18850	PUSH	cae1ef7a-182a-4de8-be5c-28ff8888cabc	Resultado final	SIMULATED	2026-10-17 15:58:10.977
f3de2de2-162c-41f4-bbea-ac066d391953	EMAIL	aficionado@demo.com	Resultado final	SIMULATED	2026-10-17 15:58:11.31
eb2006d6-2e1f-4cd0-aa1e-978df0f0b24f	PUSH	ab7d9b35-97b6-4e00-b17e-ab915cd51696	Resultado final	SIMULATED	2026-10-17 15:58:11.31
78215af4-3df6-4174-b1da-a4dcb8fe4ec4	PUSH	cae1ef7a-182a-4de8-be5c-28ff8888cabc	Resultado final	SIMULATED	2026-10-17 15:58:11.31
bcc0bc9a-3e10-4b61-b406-3afbc9ed2ba5	EMAIL	aficionado@demo.com	Resultado final	SIMULATED	2026-10-17 15:58:11.6
60337f22-93e0-4061-ad94-ff46de9e9ce5	PUSH	ab7d9b35-97b6-4e00-b17e-ab915cd51696	Resultado final	SIMULATED	2026-10-17 15:58:11.6
cd776d57-164e-4cec-b2b2-9a2adf466eb6	PUSH	cae1ef7a-182a-4de8-be5c-28ff8888cabc	Resultado final	SIMULATED	2026-10-17 15:58:11.6
b047e7a7-cce1-4281-8efc-2b1200194332	EMAIL	aficionado@demo.com	Resultado final	SIMULATED	2026-10-17 15:58:11.926
cf273419-4c95-4c56-ba13-b3091e340415	PUSH	ab7d9b35-97b6-4e00-b17e-ab915cd51696	Resultado final	SIMULATED	2026-10-17 15:58:11.926
29b66312-f4db-4036-85ec-3e59c9c54421	PUSH	cae1ef7a-182a-4de8-be5c-28ff8888cabc	Resultado final	SIMULATED	2026-10-17 15:58:11.926
fae82be0-8deb-4cc6-b2db-2c3869e282ac	EMAIL	aficionado@demo.com	Resultado final	SIMULATED	2026-10-17 15:58:12.112
758cdb48-374c-4754-9dc6-95ef810b6069	PUSH	ab7d9b35-97b6-4e00-b17e-ab915cd51696	Resultado final	SIMULATED	2026-10-17 15:58:12.112
cae4c685-7aeb-4fef-aaec-c0c541341181	PUSH	cae1ef7a-182a-4de8-be5c-28ff8888cabc	Resultado final	SIMULATED	2026-10-17 15:58:12.112
dc688f4d-2d8d-486b-9689-6876f15f1714	EMAIL	aficionado@demo.com	Resultado final	SIMULATED	2026-10-17 15:58:12.356
862a03d2-c390-4104-b087-981ae3438845	PUSH	ab7d9b35-97b6-4e00-b17e-ab915cd51696	Resultado final	SIMULATED	2026-10-17 15:58:12.356
3bb13445-ff73-47f5-94a1-ca7f02f9df3b	PUSH	cae1ef7a-182a-4de8-be5c-28ff8888cabc	Resultado final	SIMULATED	2026-10-17 15:58:12.356
b82edd4d-6065-4560-9c9c-bae966aefc3a	EMAIL	aficionado@demo.com	Resultado final	SIMULATED	2026-10-17 15:58:12.511
6dacb8ef-eadc-4ba2-9994-7d91f6a224d1	PUSH	ab7d9b35-97b6-4e00-b17e-ab915cd51696	Resultado final	SIMULATED	2026-10-17 15:58:12.511
b19bfd72-b627-4ab2-acc5-4c3bd38ae230	PUSH	cae1ef7a-182a-4de8-be5c-28ff8888cabc	Resultado final	SIMULATED	2026-10-17 15:58:12.511
79ebe112-b8d7-4f0d-90cc-f29e83c01755	EMAIL	aficionado@demo.com	Resultado final	SIMULATED	2026-10-17 15:58:12.716
b1cc2d12-7306-4990-911e-d41b12e258e1	PUSH	ab7d9b35-97b6-4e00-b17e-ab915cd51696	Resultado final	SIMULATED	2026-10-17 15:58:12.716
e9ea8675-7bbe-46ab-b5f8-a020a99fe7cc	PUSH	cae1ef7a-182a-4de8-be5c-28ff8888cabc	Resultado final	SIMULATED	2026-10-17 15:58:12.716
e1e31eb5-d241-47fa-b27b-94a62f32e3a5	EMAIL	aficionado@demo.com	Resultado final	SIMULATED	2026-10-17 15:58:12.906
b93539c6-01fb-4da2-ada0-b9b1d25e9ff3	PUSH	ab7d9b35-97b6-4e00-b17e-ab915cd51696	Resultado final	SIMULATED	2026-10-17 15:58:12.906
bc90d184-26b7-409e-9d6d-f82b66da621b	PUSH	cae1ef7a-182a-4de8-be5c-28ff8888cabc	Resultado final	SIMULATED	2026-10-17 15:58:12.906
b172da99-6b39-46a9-9b49-c4bda8f6c327	EMAIL	aficionado@demo.com	Resultado final	SIMULATED	2026-10-17 15:58:13.32
3ccb86b6-f506-4f5e-ac0a-061d79474d29	PUSH	ab7d9b35-97b6-4e00-b17e-ab915cd51696	Resultado final	SIMULATED	2026-10-17 15:58:13.32
1bcf6832-064a-4cce-bac8-6356cb68217f	PUSH	cae1ef7a-182a-4de8-be5c-28ff8888cabc	Resultado final	SIMULATED	2026-10-17 15:58:13.32
331a2543-b5c8-406c-8395-6190ea40839b	EMAIL	aficionado@demo.com	Resultado final	SIMULATED	2026-10-17 15:58:13.524
855abd56-068d-4790-b1ad-0e59634dfc6f	PUSH	ab7d9b35-97b6-4e00-b17e-ab915cd51696	Resultado final	SIMULATED	2026-10-17 15:58:13.524
5efa8999-b787-4ac0-9fab-a723bbbeae2f	PUSH	cae1ef7a-182a-4de8-be5c-28ff8888cabc	Resultado final	SIMULATED	2026-10-17 15:58:13.524
643936a0-8796-44b9-82c7-e24209c8d1b5	EMAIL	aficionado@demo.com	Resultado final	SIMULATED	2026-10-17 15:58:13.817
ac45667c-50ec-4938-84ea-2965bd69851c	PUSH	ab7d9b35-97b6-4e00-b17e-ab915cd51696	Resultado final	SIMULATED	2026-10-17 15:58:13.817
717b3214-8e1d-408d-a658-33689f739b51	PUSH	cae1ef7a-182a-4de8-be5c-28ff8888cabc	Resultado final	SIMULATED	2026-10-17 15:58:13.817
8efcce8d-7f9a-4df5-a14c-1660c12e735c	EMAIL	aficionado@demo.com	Resultado final	SIMULATED	2026-10-17 15:58:14.229
adadbd0e-1e19-4b74-93e7-f6c1c3903bac	PUSH	ab7d9b35-97b6-4e00-b17e-ab915cd51696	Resultado final	SIMULATED	2026-10-17 15:58:14.229
ceeabf73-a46e-4e65-97c9-51cb1359af4b	PUSH	cae1ef7a-182a-4de8-be5c-28ff8888cabc	Resultado final	SIMULATED	2026-10-17 15:58:14.229
bbdf6f86-21a7-480b-bb8a-d5b7f807361e	EMAIL	aficionado@demo.com	Resultado final	SIMULATED	2026-10-17 15:58:14.566
7ffd0a87-35a5-43a3-bb7e-8cc7c6b871e0	PUSH	ab7d9b35-97b6-4e00-b17e-ab915cd51696	Resultado final	SIMULATED	2026-10-17 15:58:14.566
043c1d24-f77f-4433-8722-cc73e4f4d7a9	PUSH	cae1ef7a-182a-4de8-be5c-28ff8888cabc	Resultado final	SIMULATED	2026-10-17 15:58:14.566
ffaec157-1ff1-4355-813c-15247570bbf2	EMAIL	aficionado@demo.com	Resultado final	SIMULATED	2026-10-17 15:58:14.917
1415c614-0bcb-4cd8-a9df-1d5332996fa6	PUSH	ab7d9b35-97b6-4e00-b17e-ab915cd51696	Resultado final	SIMULATED	2026-10-17 15:58:14.917
e23adb91-3bc0-4778-8a33-a57cde964962	PUSH	cae1ef7a-182a-4de8-be5c-28ff8888cabc	Resultado final	SIMULATED	2026-10-17 15:58:14.917
b5cc3f3e-5c1b-43f6-89c0-5cb41dfd34d5	EMAIL	aficionado@demo.com	Resultado final	SIMULATED	2026-10-17 15:58:15.25
85c6b41d-fe8e-43c9-a322-ab406833fa36	PUSH	ab7d9b35-97b6-4e00-b17e-ab915cd51696	Resultado final	SIMULATED	2026-10-17 15:58:15.25
9af59ee3-659e-478e-8597-90dd28f8d110	PUSH	cae1ef7a-182a-4de8-be5c-28ff8888cabc	Resultado final	SIMULATED	2026-10-17 15:58:15.25
4252119f-94a1-413f-8e8d-88bf50d7fff1	EMAIL	aficionado@demo.com	Resultado final	SIMULATED	2026-10-17 15:58:15.519
5ad33ab9-6718-4136-b5f2-ac2f6a1fc730	PUSH	ab7d9b35-97b6-4e00-b17e-ab915cd51696	Resultado final	SIMULATED	2026-10-17 15:58:15.519
c5f92fe4-60f2-4cb9-936a-581152b9d247	PUSH	cae1ef7a-182a-4de8-be5c-28ff8888cabc	Resultado final	SIMULATED	2026-10-17 15:58:15.519
b00f5ef6-e38a-43de-8ea5-c978b5ce43ca	EMAIL	aficionado@demo.com	Partido suspendido	SIMULATED	2026-10-17 15:58:15.684
0a92a8f5-e1be-41dc-a8bd-ba1c46287777	PUSH	ab7d9b35-97b6-4e00-b17e-ab915cd51696	Partido suspendido	SIMULATED	2026-10-17 15:58:15.684
0e6d31ec-8679-4d83-be2f-653d24bfe5d8	PUSH	cae1ef7a-182a-4de8-be5c-28ff8888cabc	Partido suspendido	SIMULATED	2026-10-17 15:58:15.684
ee4a3447-899c-47a5-baaa-725ae63296d1	EMAIL	aficionado@demo.com	Cambio de horario	SIMULATED	2026-10-17 15:58:15.741
b145da5e-f01f-4180-b3d4-535cca441d92	PUSH	ab7d9b35-97b6-4e00-b17e-ab915cd51696	Cambio de horario	SIMULATED	2026-10-17 15:58:15.741
010e5570-bbd4-4b5f-a112-cc478a201ebd	PUSH	cae1ef7a-182a-4de8-be5c-28ff8888cabc	Cambio de horario	SIMULATED	2026-10-17 15:58:15.741
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.notifications (id, user_id, email, role, type, title, body, link, read, event_id, dedupe_key, created_at) FROM stdin;
0dba82ed-8d5b-4256-b7b3-c02040f275e9	\N	\N	ADMIN	USER_REGISTERED	Nuevo usuario registrado	Laura Gómez (organizador@demo.com) se registró como organizador.	/admin?tab=usuarios	f	a15bbbb8-6da5-487c-840f-15e9c108bbe9	a15bbbb8-6da5-487c-840f-15e9c108bbe9:ADMIN	2026-10-17 15:58:03.577
fc1fb4ef-e3ed-4e49-84fd-de1cea303595	\N	\N	ADMIN	LEAGUE_PENDING	Nueva liga pendiente de aprobación	Laura Gómez creó la liga "Liga Amateur de Montería". Revísala para autorizarla.	/admin?tab=ligas	f	ca04c5e7-3fb1-42fd-b163-aead3c4bc66c	ca04c5e7-3fb1-42fd-b163-aead3c4bc66c:ADMIN	2026-10-17 15:58:03.675
35336645-99fb-4cf0-91fb-bc7fecfd2a82	ab7d9b35-97b6-4e00-b17e-ab915cd51696	\N	\N	LEAGUE_APPROVED	Tu liga fue aprobada	La liga "Liga Amateur de Montería" fue aprobada. Ya es pública y puedes generar el calendario. Nota del administrador: Documentación de la liga verificada	/panel/ligas/e1465a8b-d5b1-418e-abc1-9f5efba20c74	f	cc753f90-a583-47cd-aedc-7b5a2933186b	cc753f90-a583-47cd-aedc-7b5a2933186b:ab7d9b35-97b6-4e00-b17e-ab915cd51696	2026-10-17 15:58:03.715
d3928b9e-e97b-487d-9232-655b1ad90c70	\N	\N	ADMIN	USER_REGISTERED	Nuevo usuario registrado	Mario Arroyo (arbitro@demo.com) se registró como árbitro.	/admin?tab=usuarios	f	246e06f9-7871-48d3-92ac-bfaf1ca14b94	246e06f9-7871-48d3-92ac-bfaf1ca14b94:ADMIN	2026-10-17 15:58:05.098
14e8c625-502a-4a30-bd02-5f9dcd0f4a21	\N	\N	ADMIN	USER_REGISTERED	Nuevo usuario registrado	Camilo Ruiz (aficionado@demo.com) se registró como aficionado.	/admin?tab=usuarios	f	9eea4b9c-3b58-4524-b4f3-5691f3528f36	9eea4b9c-3b58-4524-b4f3-5691f3528f36:ADMIN	2026-10-17 15:58:05.311
89c42755-2b79-40b2-81bb-20a8c352cac2	ab7d9b35-97b6-4e00-b17e-ab915cd51696	\N	\N	FIXTURE_PUBLISHED	Jornada 1 programada	Liga Amateur de Montería · Libre: 3 partido(s) con horario confirmado.	/ligas/e1465a8b-d5b1-418e-abc1-9f5efba20c74?tab=calendario	f	09026a56-9a2b-4861-a008-e0e09a46a5c3	09026a56-9a2b-4861-a008-e0e09a46a5c3:ab7d9b35-97b6-4e00-b17e-ab915cd51696	2026-10-17 15:58:05.603
56601704-f564-4710-b72a-ddaf587afacf	cae1ef7a-182a-4de8-be5c-28ff8888cabc	\N	\N	FIXTURE_PUBLISHED	Jornada 1 programada	Liga Amateur de Montería · Libre: 3 partido(s) con horario confirmado.	/ligas/e1465a8b-d5b1-418e-abc1-9f5efba20c74?tab=calendario	f	09026a56-9a2b-4861-a008-e0e09a46a5c3	09026a56-9a2b-4861-a008-e0e09a46a5c3:cae1ef7a-182a-4de8-be5c-28ff8888cabc	2026-10-17 15:58:05.603
bd8efb68-e9a7-4753-90d7-220584cd0848	ab7d9b35-97b6-4e00-b17e-ab915cd51696	\N	\N	FIXTURE_PUBLISHED	Jornada 2 programada	Liga Amateur de Montería · Libre: 3 partido(s) con horario confirmado.	/ligas/e1465a8b-d5b1-418e-abc1-9f5efba20c74?tab=calendario	f	f64356f1-d6a6-448e-8ecf-24949431e1f5	f64356f1-d6a6-448e-8ecf-24949431e1f5:ab7d9b35-97b6-4e00-b17e-ab915cd51696	2026-10-17 15:58:05.629
b54ebcdd-1b9b-4444-b5f7-43fc49520ba1	cae1ef7a-182a-4de8-be5c-28ff8888cabc	\N	\N	FIXTURE_PUBLISHED	Jornada 2 programada	Liga Amateur de Montería · Libre: 3 partido(s) con horario confirmado.	/ligas/e1465a8b-d5b1-418e-abc1-9f5efba20c74?tab=calendario	f	f64356f1-d6a6-448e-8ecf-24949431e1f5	f64356f1-d6a6-448e-8ecf-24949431e1f5:cae1ef7a-182a-4de8-be5c-28ff8888cabc	2026-10-17 15:58:05.629
df897667-3bd9-41d3-b296-9828bcb879c6	ab7d9b35-97b6-4e00-b17e-ab915cd51696	\N	\N	FIXTURE_PUBLISHED	Jornada 3 programada	Liga Amateur de Montería · Libre: 3 partido(s) con horario confirmado.	/ligas/e1465a8b-d5b1-418e-abc1-9f5efba20c74?tab=calendario	f	63b7735a-5fec-4f76-a9d1-17f77b4c1437	63b7735a-5fec-4f76-a9d1-17f77b4c1437:ab7d9b35-97b6-4e00-b17e-ab915cd51696	2026-10-17 15:58:05.658
e001ef66-4503-4df2-a587-db000e67ea5c	cae1ef7a-182a-4de8-be5c-28ff8888cabc	\N	\N	FIXTURE_PUBLISHED	Jornada 3 programada	Liga Amateur de Montería · Libre: 3 partido(s) con horario confirmado.	/ligas/e1465a8b-d5b1-418e-abc1-9f5efba20c74?tab=calendario	f	63b7735a-5fec-4f76-a9d1-17f77b4c1437	63b7735a-5fec-4f76-a9d1-17f77b4c1437:cae1ef7a-182a-4de8-be5c-28ff8888cabc	2026-10-17 15:58:05.658
82d98444-115e-4d85-8f79-13e832aa5518	ab7d9b35-97b6-4e00-b17e-ab915cd51696	\N	\N	FIXTURE_PUBLISHED	Jornada 4 programada	Liga Amateur de Montería · Libre: 3 partido(s) con horario confirmado.	/ligas/e1465a8b-d5b1-418e-abc1-9f5efba20c74?tab=calendario	f	507a967d-f01c-47d1-8624-ecb422d0aec7	507a967d-f01c-47d1-8624-ecb422d0aec7:ab7d9b35-97b6-4e00-b17e-ab915cd51696	2026-10-17 15:58:05.694
3bde19ee-bebb-4a5e-8485-d504dfe027a5	cae1ef7a-182a-4de8-be5c-28ff8888cabc	\N	\N	FIXTURE_PUBLISHED	Jornada 4 programada	Liga Amateur de Montería · Libre: 3 partido(s) con horario confirmado.	/ligas/e1465a8b-d5b1-418e-abc1-9f5efba20c74?tab=calendario	f	507a967d-f01c-47d1-8624-ecb422d0aec7	507a967d-f01c-47d1-8624-ecb422d0aec7:cae1ef7a-182a-4de8-be5c-28ff8888cabc	2026-10-17 15:58:05.694
ab6217c4-5a8c-400c-9e67-70a4e8b8d731	\N	arbitro@demo.com	\N	REFEREE_ASSIGNED	Tienes un partido asignado	Tigres del Sinú vs Atlético Cereté · dom, 30 de ago, 08:00 a. m. · Estadio Municipal de Montería. Confírmalo desde tu panel.	/panel/arbitro	f	fa43091d-b1be-45c0-98db-6c9586e7217f	fa43091d-b1be-45c0-98db-6c9586e7217f:arbitro@demo.com	2026-10-17 15:58:05.723
0e143d27-54af-4bce-905a-b67396785646	ab7d9b35-97b6-4e00-b17e-ab915cd51696	\N	\N	FIXTURE_PUBLISHED	Jornada 5 programada	Liga Amateur de Montería · Libre: 3 partido(s) con horario confirmado.	/ligas/e1465a8b-d5b1-418e-abc1-9f5efba20c74?tab=calendario	f	b20208ea-a05e-4f56-ac62-9afeed20e728	b20208ea-a05e-4f56-ac62-9afeed20e728:ab7d9b35-97b6-4e00-b17e-ab915cd51696	2026-10-17 15:58:05.754
734e0f56-ee29-45a1-beef-951320afa70d	cae1ef7a-182a-4de8-be5c-28ff8888cabc	\N	\N	FIXTURE_PUBLISHED	Jornada 5 programada	Liga Amateur de Montería · Libre: 3 partido(s) con horario confirmado.	/ligas/e1465a8b-d5b1-418e-abc1-9f5efba20c74?tab=calendario	f	b20208ea-a05e-4f56-ac62-9afeed20e728	b20208ea-a05e-4f56-ac62-9afeed20e728:cae1ef7a-182a-4de8-be5c-28ff8888cabc	2026-10-17 15:58:05.754
0f05e0a0-3523-4d0c-9028-8ba81cecd217	\N	ana.beltran@demo.com	\N	REFEREE_ASSIGNED	Tienes un partido asignado	Deportivo La Ribera vs Real Lorica · dom, 30 de ago, 02:00 p. m. · Polideportivo del Sur. Confírmalo desde tu panel.	/panel/arbitro	f	7612ea27-13c7-468e-87a4-75a7bdc2cfec	7612ea27-13c7-468e-87a4-75a7bdc2cfec:ana.beltran@demo.com	2026-10-17 15:58:05.763
4c398d8d-1fe7-45c0-995b-e3fe844d0246	ab7d9b35-97b6-4e00-b17e-ab915cd51696	\N	\N	FIXTURE_PUBLISHED	Jornada 6 programada	Liga Amateur de Montería · Libre: 3 partido(s) con horario confirmado.	/ligas/e1465a8b-d5b1-418e-abc1-9f5efba20c74?tab=calendario	f	339ce7f5-c6b3-4fd3-8e1e-1b68f1dc1f8e	339ce7f5-c6b3-4fd3-8e1e-1b68f1dc1f8e:ab7d9b35-97b6-4e00-b17e-ab915cd51696	2026-10-17 15:58:05.779
425397de-eb56-4315-b2d0-3b405e911310	cae1ef7a-182a-4de8-be5c-28ff8888cabc	\N	\N	FIXTURE_PUBLISHED	Jornada 6 programada	Liga Amateur de Montería · Libre: 3 partido(s) con horario confirmado.	/ligas/e1465a8b-d5b1-418e-abc1-9f5efba20c74?tab=calendario	f	339ce7f5-c6b3-4fd3-8e1e-1b68f1dc1f8e	339ce7f5-c6b3-4fd3-8e1e-1b68f1dc1f8e:cae1ef7a-182a-4de8-be5c-28ff8888cabc	2026-10-17 15:58:05.779
6e4e3a49-fc3d-4bad-a25b-0e2430b12148	ab7d9b35-97b6-4e00-b17e-ab915cd51696	\N	\N	FIXTURE_PUBLISHED	Jornada 7 programada	Liga Amateur de Montería · Libre: 3 partido(s) con horario confirmado.	/ligas/e1465a8b-d5b1-418e-abc1-9f5efba20c74?tab=calendario	f	a144da61-9109-4125-97fe-2a9809ded859	a144da61-9109-4125-97fe-2a9809ded859:ab7d9b35-97b6-4e00-b17e-ab915cd51696	2026-10-17 15:58:05.792
ebfc3e0d-0bac-462c-9818-c211f14a26ce	cae1ef7a-182a-4de8-be5c-28ff8888cabc	\N	\N	FIXTURE_PUBLISHED	Jornada 7 programada	Liga Amateur de Montería · Libre: 3 partido(s) con horario confirmado.	/ligas/e1465a8b-d5b1-418e-abc1-9f5efba20c74?tab=calendario	f	a144da61-9109-4125-97fe-2a9809ded859	a144da61-9109-4125-97fe-2a9809ded859:cae1ef7a-182a-4de8-be5c-28ff8888cabc	2026-10-17 15:58:05.792
c83a46f9-9708-4419-8a44-8a1772731021	\N	ana.beltran@demo.com	\N	REFEREE_ASSIGNED	Tienes un partido asignado	Halcones FC vs Leones de Montería · dom, 30 de ago, 04:00 p. m. · Polideportivo del Sur. Confírmalo desde tu panel.	/panel/arbitro	f	09d55c93-1ddf-47bd-b8ac-050935c06f6a	09d55c93-1ddf-47bd-b8ac-050935c06f6a:ana.beltran@demo.com	2026-10-17 15:58:05.803
bcaae586-a2cc-4099-ba7d-295201fcec24	ab7d9b35-97b6-4e00-b17e-ab915cd51696	\N	\N	FIXTURE_PUBLISHED	Jornada 8 programada	Liga Amateur de Montería · Libre: 3 partido(s) con horario confirmado.	/ligas/e1465a8b-d5b1-418e-abc1-9f5efba20c74?tab=calendario	f	7c65c3fc-b9f5-4ba0-8ef4-9671a6cb078a	7c65c3fc-b9f5-4ba0-8ef4-9671a6cb078a:ab7d9b35-97b6-4e00-b17e-ab915cd51696	2026-10-17 15:58:05.815
aaa4befb-afe8-47d1-92c7-526955a16552	cae1ef7a-182a-4de8-be5c-28ff8888cabc	\N	\N	FIXTURE_PUBLISHED	Jornada 8 programada	Liga Amateur de Montería · Libre: 3 partido(s) con horario confirmado.	/ligas/e1465a8b-d5b1-418e-abc1-9f5efba20c74?tab=calendario	f	7c65c3fc-b9f5-4ba0-8ef4-9671a6cb078a	7c65c3fc-b9f5-4ba0-8ef4-9671a6cb078a:cae1ef7a-182a-4de8-be5c-28ff8888cabc	2026-10-17 15:58:05.815
1eb48056-5680-4bd4-97cc-b4a82c3a981b	ab7d9b35-97b6-4e00-b17e-ab915cd51696	\N	\N	FIXTURE_PUBLISHED	Jornada 9 programada	Liga Amateur de Montería · Libre: 3 partido(s) con horario confirmado.	/ligas/e1465a8b-d5b1-418e-abc1-9f5efba20c74?tab=calendario	f	a62ed95c-7842-436e-86ed-427f3b4b9394	a62ed95c-7842-436e-86ed-427f3b4b9394:ab7d9b35-97b6-4e00-b17e-ab915cd51696	2026-10-17 15:58:05.835
95fa428f-9411-4b56-ba87-af14309297b9	cae1ef7a-182a-4de8-be5c-28ff8888cabc	\N	\N	FIXTURE_PUBLISHED	Jornada 9 programada	Liga Amateur de Montería · Libre: 3 partido(s) con horario confirmado.	/ligas/e1465a8b-d5b1-418e-abc1-9f5efba20c74?tab=calendario	f	a62ed95c-7842-436e-86ed-427f3b4b9394	a62ed95c-7842-436e-86ed-427f3b4b9394:cae1ef7a-182a-4de8-be5c-28ff8888cabc	2026-10-17 15:58:05.835
51354d78-2b52-4cc5-b1da-8dae4b84e6cc	\N	rafael.pacheco@demo.com	\N	REFEREE_ASSIGNED	Tienes un partido asignado	Deportivo La Ribera vs Tigres del Sinú · dom, 6 de sept, 08:00 a. m. · Estadio Municipal de Montería. Confírmalo desde tu panel.	/panel/arbitro	f	31dd0d7a-e100-4413-97dc-a0c0c5209cc5	31dd0d7a-e100-4413-97dc-a0c0c5209cc5:rafael.pacheco@demo.com	2026-10-17 15:58:05.852
db33bed7-0f1e-4c85-9e99-fc4a4aa610ff	\N	arbitro@demo.com	\N	REFEREE_ASSIGNED	Tienes un partido asignado	Leones de Montería vs Real Lorica · dom, 6 de sept, 10:00 a. m. · Estadio Municipal de Montería. Confírmalo desde tu panel.	/panel/arbitro	f	d5de717f-a66b-4679-a67d-995732985fe0	d5de717f-a66b-4679-a67d-995732985fe0:arbitro@demo.com	2026-10-17 15:58:05.887
60478de4-c3a2-4efa-9343-3066ee9cdda0	\N	ana.beltran@demo.com	\N	REFEREE_ASSIGNED	Tienes un partido asignado	Halcones FC vs Atlético Cereté · dom, 6 de sept, 02:00 p. m. · Polideportivo del Sur. Confírmalo desde tu panel.	/panel/arbitro	f	16b9e43d-4253-4b34-93e7-73d6532f172d	16b9e43d-4253-4b34-93e7-73d6532f172d:ana.beltran@demo.com	2026-10-17 15:58:05.935
f5498fe0-89c3-42d8-8b4c-a0b8278880dc	\N	rafael.pacheco@demo.com	\N	REFEREE_ASSIGNED	Tienes un partido asignado	Tigres del Sinú vs Halcones FC · dom, 13 de sept, 08:00 a. m. · Estadio Municipal de Montería. Confírmalo desde tu panel.	/panel/arbitro	f	cb3ee782-09c5-4a5a-a0a4-55919331d958	cb3ee782-09c5-4a5a-a0a4-55919331d958:rafael.pacheco@demo.com	2026-10-17 15:58:05.979
64fd4b95-b4db-46ad-90e2-1ced8ba34c82	\N	arbitro@demo.com	\N	REFEREE_ASSIGNED	Tienes un partido asignado	Real Lorica vs Atlético Cereté · dom, 13 de sept, 10:00 a. m. · Estadio Municipal de Montería. Confírmalo desde tu panel.	/panel/arbitro	f	65c41e8e-3789-41b6-ae5e-1c2e83977f52	65c41e8e-3789-41b6-ae5e-1c2e83977f52:arbitro@demo.com	2026-10-17 15:58:06.018
be730b11-d975-4c5d-baeb-21821bd8259f	\N	ana.beltran@demo.com	\N	REFEREE_ASSIGNED	Tienes un partido asignado	Leones de Montería vs Deportivo La Ribera · dom, 13 de sept, 02:00 p. m. · Polideportivo del Sur. Confírmalo desde tu panel.	/panel/arbitro	f	23c86e0c-ca28-4f67-9421-fe5b7dae5a94	23c86e0c-ca28-4f67-9421-fe5b7dae5a94:ana.beltran@demo.com	2026-10-17 15:58:06.044
3f303f71-5724-4b8e-9703-05ce45f4d4dd	\N	rafael.pacheco@demo.com	\N	REFEREE_ASSIGNED	Tienes un partido asignado	Real Lorica vs Halcones FC · dom, 20 de sept, 08:00 a. m. · Estadio Municipal de Montería. Confírmalo desde tu panel.	/panel/arbitro	f	9cae9dd7-9b90-42f4-b738-4e277ac82dfb	9cae9dd7-9b90-42f4-b738-4e277ac82dfb:rafael.pacheco@demo.com	2026-10-17 15:58:06.06
d182a97a-8ef3-472e-a47b-ecf80332f843	\N	ana.beltran@demo.com	\N	REFEREE_ASSIGNED	Tienes un partido asignado	Leones de Montería vs Tigres del Sinú · dom, 20 de sept, 02:00 p. m. · Polideportivo del Sur. Confírmalo desde tu panel.	/panel/arbitro	f	fe0f4973-d614-45cc-add1-34246c1029ff	fe0f4973-d614-45cc-add1-34246c1029ff:ana.beltran@demo.com	2026-10-17 15:58:06.08
55e05537-f0a2-4834-adec-b7cdfe190dfe	\N	ana.beltran@demo.com	\N	REFEREE_ASSIGNED	Tienes un partido asignado	Atlético Cereté vs Deportivo La Ribera · dom, 20 de sept, 04:00 p. m. · Polideportivo del Sur. Confírmalo desde tu panel.	/panel/arbitro	f	29156834-a27f-43f3-ad12-a94ec0bd05cc	29156834-a27f-43f3-ad12-a94ec0bd05cc:ana.beltran@demo.com	2026-10-17 15:58:06.093
ee2158ae-f8a2-46c7-ab6e-29d2a4214559	\N	arbitro@demo.com	\N	REFEREE_ASSIGNED	Tienes un partido asignado	Tigres del Sinú vs Real Lorica · dom, 27 de sept, 08:00 a. m. · Estadio Municipal de Montería. Confírmalo desde tu panel.	/panel/arbitro	f	7f08c77b-4f61-4d36-8b88-d03661225d1d	7f08c77b-4f61-4d36-8b88-d03661225d1d:arbitro@demo.com	2026-10-17 15:58:06.116
e33a2ed8-1ad3-46b6-b873-5236d5dfbb81	\N	rafael.pacheco@demo.com	\N	REFEREE_ASSIGNED	Tienes un partido asignado	Deportivo La Ribera vs Halcones FC · dom, 27 de sept, 10:00 a. m. · Estadio Municipal de Montería. Confírmalo desde tu panel.	/panel/arbitro	f	8a6e4885-efb9-4688-b3ab-7e61718e921e	8a6e4885-efb9-4688-b3ab-7e61718e921e:rafael.pacheco@demo.com	2026-10-17 15:58:06.137
8f55f92d-9c73-45dc-a808-1ba6b2ede51c	\N	ana.beltran@demo.com	\N	REFEREE_ASSIGNED	Tienes un partido asignado	Atlético Cereté vs Leones de Montería · dom, 27 de sept, 02:00 p. m. · Polideportivo del Sur. Confírmalo desde tu panel.	/panel/arbitro	f	bbd299f0-9842-4bc1-9f3c-5d69123343ad	bbd299f0-9842-4bc1-9f3c-5d69123343ad:ana.beltran@demo.com	2026-10-17 15:58:06.161
8dda1803-9f49-4e59-a914-3cf61baed695	\N	arbitro@demo.com	\N	REFEREE_ASSIGNED	Tienes un partido asignado	Real Lorica vs Deportivo La Ribera · dom, 4 de oct, 08:00 a. m. · Estadio Municipal de Montería. Confírmalo desde tu panel.	/panel/arbitro	f	c8b1447f-d16f-41fb-a9b0-7ef8bbdaf1c4	c8b1447f-d16f-41fb-a9b0-7ef8bbdaf1c4:arbitro@demo.com	2026-10-17 15:58:06.184
be9945b2-fe71-474d-a6c8-27d24982e8ab	\N	ana.beltran@demo.com	\N	REFEREE_ASSIGNED	Tienes un partido asignado	Atlético Cereté vs Tigres del Sinú · dom, 4 de oct, 02:00 p. m. · Polideportivo del Sur. Confírmalo desde tu panel.	/panel/arbitro	f	276c34a2-a9f6-466e-9a72-8800f696e403	276c34a2-a9f6-466e-9a72-8800f696e403:ana.beltran@demo.com	2026-10-17 15:58:06.203
c6d2d5cc-858f-4cd4-a975-8b4b02f3e2ce	\N	ana.beltran@demo.com	\N	REFEREE_ASSIGNED	Tienes un partido asignado	Leones de Montería vs Halcones FC · dom, 4 de oct, 04:00 p. m. · Polideportivo del Sur. Confírmalo desde tu panel.	/panel/arbitro	f	576708d0-84f9-4ae0-9ad9-137b850c7c7e	576708d0-84f9-4ae0-9ad9-137b850c7c7e:ana.beltran@demo.com	2026-10-17 15:58:06.222
39d4f448-22bc-42ec-98f9-bb6d4f814f16	\N	arbitro@demo.com	\N	REFEREE_ASSIGNED	Tienes un partido asignado	Tigres del Sinú vs Deportivo La Ribera · dom, 11 de oct, 08:00 a. m. · Estadio Municipal de Montería. Confírmalo desde tu panel.	/panel/arbitro	f	ab543075-e413-42a8-b23c-76ea40bf7c10	ab543075-e413-42a8-b23c-76ea40bf7c10:arbitro@demo.com	2026-10-17 15:58:06.244
f3735216-4736-43f7-8851-2fdcccc3a0d0	\N	rafael.pacheco@demo.com	\N	REFEREE_ASSIGNED	Tienes un partido asignado	Real Lorica vs Leones de Montería · dom, 11 de oct, 10:00 a. m. · Estadio Municipal de Montería. Confírmalo desde tu panel.	/panel/arbitro	f	3d203ba4-5cd6-4cbf-b026-79175d13a927	3d203ba4-5cd6-4cbf-b026-79175d13a927:rafael.pacheco@demo.com	2026-10-17 15:58:06.261
48d2cce9-acde-4a19-95b6-02fa04381786	\N	ana.beltran@demo.com	\N	REFEREE_ASSIGNED	Tienes un partido asignado	Atlético Cereté vs Halcones FC · dom, 11 de oct, 02:00 p. m. · Polideportivo del Sur. Confírmalo desde tu panel.	/panel/arbitro	f	0f79044b-9e59-40f9-b87c-da3464d61866	0f79044b-9e59-40f9-b87c-da3464d61866:ana.beltran@demo.com	2026-10-17 15:58:06.282
3073f631-7b7c-4edc-bfe0-0e6d2415d616	\N	arbitro@demo.com	\N	REFEREE_ASSIGNED	Tienes un partido asignado	Deportivo La Ribera vs Leones de Montería · dom, 18 de oct, 08:00 a. m. · Estadio Municipal de Montería. Confírmalo desde tu panel.	/panel/arbitro	f	3d5061a8-7812-4b51-b160-afa50d3eb02d	3d5061a8-7812-4b51-b160-afa50d3eb02d:arbitro@demo.com	2026-10-17 15:58:06.298
17ef23d1-6ebf-4c74-8063-38505af7efcf	ab7d9b35-97b6-4e00-b17e-ab915cd51696	\N	\N	FIXTURE_PUBLISHED	Jornada 10 programada	Liga Amateur de Montería · Libre: 3 partido(s) con horario confirmado.	/ligas/e1465a8b-d5b1-418e-abc1-9f5efba20c74?tab=calendario	f	67b79d5b-6d92-4b98-b7d0-7e96c4eb00d2	67b79d5b-6d92-4b98-b7d0-7e96c4eb00d2:ab7d9b35-97b6-4e00-b17e-ab915cd51696	2026-10-17 15:58:05.854
3581fef2-510c-416b-bd9c-a7d8c7341994	cae1ef7a-182a-4de8-be5c-28ff8888cabc	\N	\N	FIXTURE_PUBLISHED	Jornada 10 programada	Liga Amateur de Montería · Libre: 3 partido(s) con horario confirmado.	/ligas/e1465a8b-d5b1-418e-abc1-9f5efba20c74?tab=calendario	f	67b79d5b-6d92-4b98-b7d0-7e96c4eb00d2	67b79d5b-6d92-4b98-b7d0-7e96c4eb00d2:cae1ef7a-182a-4de8-be5c-28ff8888cabc	2026-10-17 15:58:05.854
9900a47b-1782-4070-8be3-1f35bf277ee5	\N	ana.beltran@demo.com	\N	REFEREE_ASSIGNED	Tienes un partido asignado	Halcones FC vs Tigres del Sinú · dom, 18 de oct, 02:00 p. m. · Polideportivo del Sur. Confírmalo desde tu panel.	/panel/arbitro	f	54d2a441-d34c-4271-9668-acb0e8327268	54d2a441-d34c-4271-9668-acb0e8327268:ana.beltran@demo.com	2026-10-17 15:58:06.317
f8d7f1d0-7324-4838-94de-ea1c77a32881	\N	ana.beltran@demo.com	\N	REFEREE_ASSIGNED	Tienes un partido asignado	Atlético Cereté vs Real Lorica · dom, 18 de oct, 04:00 p. m. · Polideportivo del Sur. Confírmalo desde tu panel.	/panel/arbitro	f	c5c5b7e8-1ad4-4564-8532-e969e4e7634e	c5c5b7e8-1ad4-4564-8532-e969e4e7634e:ana.beltran@demo.com	2026-10-17 15:58:06.338
a9c952c7-a025-4760-b01e-e341e7fa72b3	\N	rafael.pacheco@demo.com	\N	REFEREE_ASSIGNED	Tienes un partido asignado	Tigres del Sinú vs Leones de Montería · dom, 25 de oct, 08:00 a. m. · Estadio Municipal de Montería. Confírmalo desde tu panel.	/panel/arbitro	f	c4396a1a-9931-428c-bc7a-1990888fcb2a	c4396a1a-9931-428c-bc7a-1990888fcb2a:rafael.pacheco@demo.com	2026-10-17 15:58:06.357
f425ef3a-4ea0-4d5d-8b5b-cdba7dc399b0	\N	rafael.pacheco@demo.com	\N	REFEREE_ASSIGNED	Tienes un partido asignado	Deportivo La Ribera vs Atlético Cereté · dom, 25 de oct, 10:00 a. m. · Estadio Municipal de Montería. Confírmalo desde tu panel.	/panel/arbitro	f	8217706e-d2ae-4af1-8c6e-ef96f446ce92	8217706e-d2ae-4af1-8c6e-ef96f446ce92:rafael.pacheco@demo.com	2026-10-17 15:58:06.377
8bb1874f-4aae-47eb-9142-ab95845a7ebf	\N	ana.beltran@demo.com	\N	REFEREE_ASSIGNED	Tienes un partido asignado	Halcones FC vs Real Lorica · dom, 25 de oct, 02:00 p. m. · Polideportivo del Sur. Confírmalo desde tu panel.	/panel/arbitro	f	a7677514-4da3-4efe-92d3-49f3366fdf58	a7677514-4da3-4efe-92d3-49f3366fdf58:ana.beltran@demo.com	2026-10-17 15:58:06.394
b4f48b07-ed1a-4fc3-9260-5f1aa5ed6399	\N	arbitro@demo.com	\N	REFEREE_ASSIGNED	Tienes un partido asignado	Leones de Montería vs Atlético Cereté · dom, 1 de nov, 08:00 a. m. · Estadio Municipal de Montería. Confírmalo desde tu panel.	/panel/arbitro	f	b032a0c5-3c4b-4aff-b8e5-68abd94ef1be	b032a0c5-3c4b-4aff-b8e5-68abd94ef1be:arbitro@demo.com	2026-10-17 15:58:06.411
8da58fec-472d-4dda-bed5-63ced72a8338	\N	ana.beltran@demo.com	\N	REFEREE_ASSIGNED	Tienes un partido asignado	Real Lorica vs Tigres del Sinú · dom, 1 de nov, 02:00 p. m. · Polideportivo del Sur. Confírmalo desde tu panel.	/panel/arbitro	f	027ffd3c-16e6-442f-b7d4-76da916158b1	027ffd3c-16e6-442f-b7d4-76da916158b1:ana.beltran@demo.com	2026-10-17 15:58:06.432
38bf9f8f-46c5-41e6-964c-18bf86915a54	\N	ana.beltran@demo.com	\N	REFEREE_ASSIGNED	Tienes un partido asignado	Halcones FC vs Deportivo La Ribera · dom, 1 de nov, 04:00 p. m. · Polideportivo del Sur. Confírmalo desde tu panel.	/panel/arbitro	f	f7c1fabe-b5f4-4998-ae87-8b8498a80a2b	f7c1fabe-b5f4-4998-ae87-8b8498a80a2b:ana.beltran@demo.com	2026-10-17 15:58:06.461
e820546f-cd3b-4f10-a3a1-a4dfa47741d8	ab7d9b35-97b6-4e00-b17e-ab915cd51696	\N	\N	MATCH_RESULT	Resultado final	Tigres del Sinú 0 - 0 Atlético Cereté	/partidos/5a68f769-52fd-43d5-a5f6-db37fe8cb545	f	8826bf25-109d-41d3-a65e-04e3d2a96768	8826bf25-109d-41d3-a65e-04e3d2a96768:ab7d9b35-97b6-4e00-b17e-ab915cd51696	2026-10-17 15:58:10.126
5679d393-d2a6-416f-9ab0-8a0bc21beb43	cae1ef7a-182a-4de8-be5c-28ff8888cabc	\N	\N	MATCH_RESULT	Resultado final	Tigres del Sinú 0 - 0 Atlético Cereté	/partidos/5a68f769-52fd-43d5-a5f6-db37fe8cb545	f	8826bf25-109d-41d3-a65e-04e3d2a96768	8826bf25-109d-41d3-a65e-04e3d2a96768:cae1ef7a-182a-4de8-be5c-28ff8888cabc	2026-10-17 15:58:10.126
c586ea25-681c-4997-8d43-b7ae4396b376	ab7d9b35-97b6-4e00-b17e-ab915cd51696	\N	\N	MATCH_RESULT	Resultado final	Deportivo La Ribera 4 - 1 Real Lorica	/partidos/68f2e9ed-483c-41e8-8dbb-50a0b76d7082	f	7d0d83ea-8d7f-4657-95e4-47d24caa149f	7d0d83ea-8d7f-4657-95e4-47d24caa149f:ab7d9b35-97b6-4e00-b17e-ab915cd51696	2026-10-17 15:58:10.406
9479354b-a737-4c1a-b0dd-eb8873134f23	cae1ef7a-182a-4de8-be5c-28ff8888cabc	\N	\N	MATCH_RESULT	Resultado final	Deportivo La Ribera 4 - 1 Real Lorica	/partidos/68f2e9ed-483c-41e8-8dbb-50a0b76d7082	f	7d0d83ea-8d7f-4657-95e4-47d24caa149f	7d0d83ea-8d7f-4657-95e4-47d24caa149f:cae1ef7a-182a-4de8-be5c-28ff8888cabc	2026-10-17 15:58:10.406
47f2958b-367d-438c-843b-3c96a9444d83	ab7d9b35-97b6-4e00-b17e-ab915cd51696	\N	\N	MATCH_RESULT	Resultado final	Halcones FC 1 - 0 Leones de Montería	/partidos/4f6fb652-5483-48de-9f65-fab75b5a1abc	f	3eb732fc-3094-4e06-89d9-ece681bb1cc3	3eb732fc-3094-4e06-89d9-ece681bb1cc3:ab7d9b35-97b6-4e00-b17e-ab915cd51696	2026-10-17 15:58:10.676
184cf1e4-28e2-4e5f-bd35-04187a9a9b9c	cae1ef7a-182a-4de8-be5c-28ff8888cabc	\N	\N	MATCH_RESULT	Resultado final	Halcones FC 1 - 0 Leones de Montería	/partidos/4f6fb652-5483-48de-9f65-fab75b5a1abc	f	3eb732fc-3094-4e06-89d9-ece681bb1cc3	3eb732fc-3094-4e06-89d9-ece681bb1cc3:cae1ef7a-182a-4de8-be5c-28ff8888cabc	2026-10-17 15:58:10.676
58f112e3-426f-433f-8e2b-fc21782edbf0	ab7d9b35-97b6-4e00-b17e-ab915cd51696	\N	\N	MATCH_RESULT	Resultado final	Deportivo La Ribera 1 - 4 Tigres del Sinú	/partidos/0d759168-6570-4058-9717-ae3c3ec90e42	f	b005feb8-5c88-4faf-a476-39f7f6f1311f	b005feb8-5c88-4faf-a476-39f7f6f1311f:ab7d9b35-97b6-4e00-b17e-ab915cd51696	2026-10-17 15:58:10.97
1df49588-e6b9-409e-84bf-1119af016ac7	cae1ef7a-182a-4de8-be5c-28ff8888cabc	\N	\N	MATCH_RESULT	Resultado final	Deportivo La Ribera 1 - 4 Tigres del Sinú	/partidos/0d759168-6570-4058-9717-ae3c3ec90e42	f	b005feb8-5c88-4faf-a476-39f7f6f1311f	b005feb8-5c88-4faf-a476-39f7f6f1311f:cae1ef7a-182a-4de8-be5c-28ff8888cabc	2026-10-17 15:58:10.97
984a141f-e9a6-4895-98e0-aaa0767306bb	ab7d9b35-97b6-4e00-b17e-ab915cd51696	\N	\N	MATCH_RESULT	Resultado final	Leones de Montería 1 - 4 Real Lorica	/partidos/a39c5742-4fdf-4c2a-894a-c5258fdaebc3	f	5bfcafab-6054-4fea-8630-7906fb6d407b	5bfcafab-6054-4fea-8630-7906fb6d407b:ab7d9b35-97b6-4e00-b17e-ab915cd51696	2026-10-17 15:58:11.306
f16bdf45-0be1-4a86-8c73-2b8cbf41536b	cae1ef7a-182a-4de8-be5c-28ff8888cabc	\N	\N	MATCH_RESULT	Resultado final	Leones de Montería 1 - 4 Real Lorica	/partidos/a39c5742-4fdf-4c2a-894a-c5258fdaebc3	f	5bfcafab-6054-4fea-8630-7906fb6d407b	5bfcafab-6054-4fea-8630-7906fb6d407b:cae1ef7a-182a-4de8-be5c-28ff8888cabc	2026-10-17 15:58:11.306
ae424f21-749b-4515-bf9b-4cf3dabc36ca	ab7d9b35-97b6-4e00-b17e-ab915cd51696	\N	\N	MATCH_RESULT	Resultado final	Halcones FC 2 - 0 Atlético Cereté	/partidos/7f6961be-530a-4365-8f72-70c525432a9c	f	21acd1fe-6e37-4542-a7a6-3d0b73d894c9	21acd1fe-6e37-4542-a7a6-3d0b73d894c9:ab7d9b35-97b6-4e00-b17e-ab915cd51696	2026-10-17 15:58:11.594
70ef176a-80fd-4c00-8bcb-0483464caa60	cae1ef7a-182a-4de8-be5c-28ff8888cabc	\N	\N	MATCH_RESULT	Resultado final	Halcones FC 2 - 0 Atlético Cereté	/partidos/7f6961be-530a-4365-8f72-70c525432a9c	f	21acd1fe-6e37-4542-a7a6-3d0b73d894c9	21acd1fe-6e37-4542-a7a6-3d0b73d894c9:cae1ef7a-182a-4de8-be5c-28ff8888cabc	2026-10-17 15:58:11.594
9c5152f7-00f1-42ed-9aa6-35992ebf8d6f	ab7d9b35-97b6-4e00-b17e-ab915cd51696	\N	\N	MATCH_RESULT	Resultado final	Tigres del Sinú 3 - 4 Halcones FC	/partidos/946b0e8d-5750-40d9-82c9-28963daa90c1	f	77c45c97-fa2c-474c-baa2-901c5da7fb1f	77c45c97-fa2c-474c-baa2-901c5da7fb1f:ab7d9b35-97b6-4e00-b17e-ab915cd51696	2026-10-17 15:58:11.921
d12de22d-0246-4215-9f5f-8cd1d1bdef3d	cae1ef7a-182a-4de8-be5c-28ff8888cabc	\N	\N	MATCH_RESULT	Resultado final	Tigres del Sinú 3 - 4 Halcones FC	/partidos/946b0e8d-5750-40d9-82c9-28963daa90c1	f	77c45c97-fa2c-474c-baa2-901c5da7fb1f	77c45c97-fa2c-474c-baa2-901c5da7fb1f:cae1ef7a-182a-4de8-be5c-28ff8888cabc	2026-10-17 15:58:11.921
c064224d-4e10-4e12-af80-cdf138e8d051	ab7d9b35-97b6-4e00-b17e-ab915cd51696	\N	\N	MATCH_RESULT	Resultado final	Real Lorica 1 - 0 Atlético Cereté	/partidos/58dd0ad4-afde-46cf-b2dd-b658a64cea8a	f	04dc78fc-26b2-4667-b353-19f7af83439c	04dc78fc-26b2-4667-b353-19f7af83439c:ab7d9b35-97b6-4e00-b17e-ab915cd51696	2026-10-17 15:58:12.107
04b5ad9c-6f44-4503-810d-4ce4eb4c7b0b	cae1ef7a-182a-4de8-be5c-28ff8888cabc	\N	\N	MATCH_RESULT	Resultado final	Real Lorica 1 - 0 Atlético Cereté	/partidos/58dd0ad4-afde-46cf-b2dd-b658a64cea8a	f	04dc78fc-26b2-4667-b353-19f7af83439c	04dc78fc-26b2-4667-b353-19f7af83439c:cae1ef7a-182a-4de8-be5c-28ff8888cabc	2026-10-17 15:58:12.107
15bc80ac-3e57-4b1a-8166-8cfa95c2ed11	ab7d9b35-97b6-4e00-b17e-ab915cd51696	\N	\N	MATCH_RESULT	Resultado final	Leones de Montería 0 - 4 Deportivo La Ribera	/partidos/aa369254-a42b-4b36-a4cd-fd3624dca403	f	b2e3a9f6-1410-43db-b094-6df15e7f74e7	b2e3a9f6-1410-43db-b094-6df15e7f74e7:ab7d9b35-97b6-4e00-b17e-ab915cd51696	2026-10-17 15:58:12.349
1255cfaa-65cc-41dd-9078-05ee08ec8667	cae1ef7a-182a-4de8-be5c-28ff8888cabc	\N	\N	MATCH_RESULT	Resultado final	Leones de Montería 0 - 4 Deportivo La Ribera	/partidos/aa369254-a42b-4b36-a4cd-fd3624dca403	f	b2e3a9f6-1410-43db-b094-6df15e7f74e7	b2e3a9f6-1410-43db-b094-6df15e7f74e7:cae1ef7a-182a-4de8-be5c-28ff8888cabc	2026-10-17 15:58:12.349
d07ef5b3-8e46-4405-9855-b3c077ef62b6	ab7d9b35-97b6-4e00-b17e-ab915cd51696	\N	\N	MATCH_RESULT	Resultado final	Real Lorica 1 - 0 Halcones FC	/partidos/4e5ba4a4-455a-45d1-aadb-ae47d00660be	f	4a527bba-42db-4380-9176-7898526413b7	4a527bba-42db-4380-9176-7898526413b7:ab7d9b35-97b6-4e00-b17e-ab915cd51696	2026-10-17 15:58:12.508
915d1213-515c-4047-be2c-dab3c3ca5ac9	cae1ef7a-182a-4de8-be5c-28ff8888cabc	\N	\N	MATCH_RESULT	Resultado final	Real Lorica 1 - 0 Halcones FC	/partidos/4e5ba4a4-455a-45d1-aadb-ae47d00660be	f	4a527bba-42db-4380-9176-7898526413b7	4a527bba-42db-4380-9176-7898526413b7:cae1ef7a-182a-4de8-be5c-28ff8888cabc	2026-10-17 15:58:12.508
f9c86186-5cf0-4230-b278-c908cdfadcdf	ab7d9b35-97b6-4e00-b17e-ab915cd51696	\N	\N	MATCH_RESULT	Resultado final	Leones de Montería 0 - 1 Tigres del Sinú	/partidos/17d59921-c355-40cb-95b6-afd38c212124	f	62fcd07e-eb2a-4a72-acc9-fd727cca070b	62fcd07e-eb2a-4a72-acc9-fd727cca070b:ab7d9b35-97b6-4e00-b17e-ab915cd51696	2026-10-17 15:58:12.706
af195138-660e-4101-b49a-11ec6c6cdb3c	cae1ef7a-182a-4de8-be5c-28ff8888cabc	\N	\N	MATCH_RESULT	Resultado final	Leones de Montería 0 - 1 Tigres del Sinú	/partidos/17d59921-c355-40cb-95b6-afd38c212124	f	62fcd07e-eb2a-4a72-acc9-fd727cca070b	62fcd07e-eb2a-4a72-acc9-fd727cca070b:cae1ef7a-182a-4de8-be5c-28ff8888cabc	2026-10-17 15:58:12.706
094e1d68-6580-4b03-872a-c4aa6b2977fe	ab7d9b35-97b6-4e00-b17e-ab915cd51696	\N	\N	MATCH_RESULT	Resultado final	Atlético Cereté 2 - 0 Deportivo La Ribera	/partidos/85e59089-be9a-4c45-9600-85a287009a56	f	537efeff-c771-4b43-8012-759a40a49ee1	537efeff-c771-4b43-8012-759a40a49ee1:ab7d9b35-97b6-4e00-b17e-ab915cd51696	2026-10-17 15:58:12.901
fc6fb640-833d-4e8c-8a28-a248d9ce96cd	cae1ef7a-182a-4de8-be5c-28ff8888cabc	\N	\N	MATCH_RESULT	Resultado final	Atlético Cereté 2 - 0 Deportivo La Ribera	/partidos/85e59089-be9a-4c45-9600-85a287009a56	f	537efeff-c771-4b43-8012-759a40a49ee1	537efeff-c771-4b43-8012-759a40a49ee1:cae1ef7a-182a-4de8-be5c-28ff8888cabc	2026-10-17 15:58:12.901
f966ae78-97d2-492a-ae19-8c8665a0b607	ab7d9b35-97b6-4e00-b17e-ab915cd51696	\N	\N	MATCH_RESULT	Resultado final	Tigres del Sinú 3 - 4 Real Lorica	/partidos/164d663d-0e19-447b-9ac7-66262a7cdc5a	f	02287403-794c-4b38-bf63-9ee12b07c2a3	02287403-794c-4b38-bf63-9ee12b07c2a3:ab7d9b35-97b6-4e00-b17e-ab915cd51696	2026-10-17 15:58:13.312
ebfdeadf-aad1-4b35-97b5-abb1101d994b	cae1ef7a-182a-4de8-be5c-28ff8888cabc	\N	\N	MATCH_RESULT	Resultado final	Tigres del Sinú 3 - 4 Real Lorica	/partidos/164d663d-0e19-447b-9ac7-66262a7cdc5a	f	02287403-794c-4b38-bf63-9ee12b07c2a3	02287403-794c-4b38-bf63-9ee12b07c2a3:cae1ef7a-182a-4de8-be5c-28ff8888cabc	2026-10-17 15:58:13.312
ceae6bc2-ba40-4774-9b84-7b91690fd9a2	ab7d9b35-97b6-4e00-b17e-ab915cd51696	\N	\N	MATCH_RESULT	Resultado final	Deportivo La Ribera 1 - 0 Halcones FC	/partidos/5949d616-faf0-4dc8-a3d0-22f773454225	f	63f5f8d8-bb11-4201-bae8-6c579f531a83	63f5f8d8-bb11-4201-bae8-6c579f531a83:ab7d9b35-97b6-4e00-b17e-ab915cd51696	2026-10-17 15:58:13.516
0a98cb97-7dee-40b3-9e9b-fdba11a7cf45	cae1ef7a-182a-4de8-be5c-28ff8888cabc	\N	\N	MATCH_RESULT	Resultado final	Deportivo La Ribera 1 - 0 Halcones FC	/partidos/5949d616-faf0-4dc8-a3d0-22f773454225	f	63f5f8d8-bb11-4201-bae8-6c579f531a83	63f5f8d8-bb11-4201-bae8-6c579f531a83:cae1ef7a-182a-4de8-be5c-28ff8888cabc	2026-10-17 15:58:13.516
49b24504-bdd3-4ed4-bf65-fac2c11f7906	ab7d9b35-97b6-4e00-b17e-ab915cd51696	\N	\N	MATCH_RESULT	Resultado final	Atlético Cereté 1 - 1 Leones de Montería	/partidos/dcae3a01-e4b1-4b24-a590-52c23e701038	f	e3c96e3d-d61d-4d65-ac63-fb8e63b5d048	e3c96e3d-d61d-4d65-ac63-fb8e63b5d048:ab7d9b35-97b6-4e00-b17e-ab915cd51696	2026-10-17 15:58:13.805
d99ad739-4ff4-4260-ba6c-fff320cd96e7	cae1ef7a-182a-4de8-be5c-28ff8888cabc	\N	\N	MATCH_RESULT	Resultado final	Atlético Cereté 1 - 1 Leones de Montería	/partidos/dcae3a01-e4b1-4b24-a590-52c23e701038	f	e3c96e3d-d61d-4d65-ac63-fb8e63b5d048	e3c96e3d-d61d-4d65-ac63-fb8e63b5d048:cae1ef7a-182a-4de8-be5c-28ff8888cabc	2026-10-17 15:58:13.805
e60b2860-6a95-44ee-acab-4358547c348d	ab7d9b35-97b6-4e00-b17e-ab915cd51696	\N	\N	MATCH_RESULT	Resultado final	Real Lorica 3 - 1 Deportivo La Ribera	/partidos/9a8499dd-8f31-4e13-80f8-a835ff60c70f	f	e875b370-d36a-47e1-ae07-f71a3e12abca	e875b370-d36a-47e1-ae07-f71a3e12abca:ab7d9b35-97b6-4e00-b17e-ab915cd51696	2026-10-17 15:58:14.223
5a0e9536-e198-4d1e-a707-2366551531ff	cae1ef7a-182a-4de8-be5c-28ff8888cabc	\N	\N	MATCH_RESULT	Resultado final	Real Lorica 3 - 1 Deportivo La Ribera	/partidos/9a8499dd-8f31-4e13-80f8-a835ff60c70f	f	e875b370-d36a-47e1-ae07-f71a3e12abca	e875b370-d36a-47e1-ae07-f71a3e12abca:cae1ef7a-182a-4de8-be5c-28ff8888cabc	2026-10-17 15:58:14.223
e6b829cc-6f60-4e0e-93bf-8ab0b2d7c2f5	ab7d9b35-97b6-4e00-b17e-ab915cd51696	\N	\N	MATCH_RESULT	Resultado final	Atlético Cereté 0 - 1 Tigres del Sinú	/partidos/c5cbce55-1e3b-4300-b1b5-1255903f5a20	f	9732403f-1683-4bef-aba7-d6f0839d77fa	9732403f-1683-4bef-aba7-d6f0839d77fa:ab7d9b35-97b6-4e00-b17e-ab915cd51696	2026-10-17 15:58:14.55
c458262b-7ddc-47c3-83d3-78468ef9ed9f	cae1ef7a-182a-4de8-be5c-28ff8888cabc	\N	\N	MATCH_RESULT	Resultado final	Atlético Cereté 0 - 1 Tigres del Sinú	/partidos/c5cbce55-1e3b-4300-b1b5-1255903f5a20	f	9732403f-1683-4bef-aba7-d6f0839d77fa	9732403f-1683-4bef-aba7-d6f0839d77fa:cae1ef7a-182a-4de8-be5c-28ff8888cabc	2026-10-17 15:58:14.55
8cfae7c7-634a-40c6-9cf0-534673a342a7	ab7d9b35-97b6-4e00-b17e-ab915cd51696	\N	\N	MATCH_RESULT	Resultado final	Leones de Montería 2 - 1 Halcones FC	/partidos/904e9388-81db-443f-87f6-3e3a39ea27f9	f	ce49b8b6-b46f-49c4-9164-a05d8d1178db	ce49b8b6-b46f-49c4-9164-a05d8d1178db:ab7d9b35-97b6-4e00-b17e-ab915cd51696	2026-10-17 15:58:14.909
a94f2498-eade-4b08-8b65-4e2f5996bf0b	cae1ef7a-182a-4de8-be5c-28ff8888cabc	\N	\N	MATCH_RESULT	Resultado final	Leones de Montería 2 - 1 Halcones FC	/partidos/904e9388-81db-443f-87f6-3e3a39ea27f9	f	ce49b8b6-b46f-49c4-9164-a05d8d1178db	ce49b8b6-b46f-49c4-9164-a05d8d1178db:cae1ef7a-182a-4de8-be5c-28ff8888cabc	2026-10-17 15:58:14.909
63846340-93eb-49f5-8b15-5d645f5881c8	ab7d9b35-97b6-4e00-b17e-ab915cd51696	\N	\N	MATCH_RESULT	Resultado final	Tigres del Sinú 2 - 1 Deportivo La Ribera	/partidos/f3caf4be-b9a0-4011-bd67-60aa8d81bcd5	f	8fbe9946-69fb-4d14-910f-c3d59183e838	8fbe9946-69fb-4d14-910f-c3d59183e838:ab7d9b35-97b6-4e00-b17e-ab915cd51696	2026-10-17 15:58:15.243
1348aa72-0c5b-4334-b29e-e9093f28fa13	cae1ef7a-182a-4de8-be5c-28ff8888cabc	\N	\N	MATCH_RESULT	Resultado final	Tigres del Sinú 2 - 1 Deportivo La Ribera	/partidos/f3caf4be-b9a0-4011-bd67-60aa8d81bcd5	f	8fbe9946-69fb-4d14-910f-c3d59183e838	8fbe9946-69fb-4d14-910f-c3d59183e838:cae1ef7a-182a-4de8-be5c-28ff8888cabc	2026-10-17 15:58:15.243
e1f5136c-6dd1-45fa-88fb-bc4252331fff	ab7d9b35-97b6-4e00-b17e-ab915cd51696	\N	\N	MATCH_RESULT	Resultado final	Real Lorica 1 - 1 Leones de Montería	/partidos/ff95bca3-f823-4026-8c6f-3c94990de590	f	c370d95f-4390-4cf4-b44a-3079340be69b	c370d95f-4390-4cf4-b44a-3079340be69b:ab7d9b35-97b6-4e00-b17e-ab915cd51696	2026-10-17 15:58:15.512
5e1e0603-a64b-4df8-9a7f-3d0d969ac94a	cae1ef7a-182a-4de8-be5c-28ff8888cabc	\N	\N	MATCH_RESULT	Resultado final	Real Lorica 1 - 1 Leones de Montería	/partidos/ff95bca3-f823-4026-8c6f-3c94990de590	f	c370d95f-4390-4cf4-b44a-3079340be69b	c370d95f-4390-4cf4-b44a-3079340be69b:cae1ef7a-182a-4de8-be5c-28ff8888cabc	2026-10-17 15:58:15.512
56095f64-0703-4bde-9d38-e22d1fd04270	ab7d9b35-97b6-4e00-b17e-ab915cd51696	\N	\N	MATCH_SUSPENDED	Partido suspendido	Deportivo La Ribera vs Leones de Montería: Cancha en mantenimiento por lluvias	/partidos/c3ca84b4-19ca-4088-a77a-e592fcd477bd	f	3136af24-2fd1-4975-9bc6-a71c710efeaa	3136af24-2fd1-4975-9bc6-a71c710efeaa:ab7d9b35-97b6-4e00-b17e-ab915cd51696	2026-10-17 15:58:15.677
f03a6f95-7b02-459a-b34c-a0acad694f21	cae1ef7a-182a-4de8-be5c-28ff8888cabc	\N	\N	MATCH_SUSPENDED	Partido suspendido	Deportivo La Ribera vs Leones de Montería: Cancha en mantenimiento por lluvias	/partidos/c3ca84b4-19ca-4088-a77a-e592fcd477bd	f	3136af24-2fd1-4975-9bc6-a71c710efeaa	3136af24-2fd1-4975-9bc6-a71c710efeaa:cae1ef7a-182a-4de8-be5c-28ff8888cabc	2026-10-17 15:58:15.677
6959e197-251a-4d05-97b0-b54ed0bfb905	ab7d9b35-97b6-4e00-b17e-ab915cd51696	\N	\N	MATCH_RESCHEDULED	Cambio de horario	Halcones FC vs Tigres del Sinú: ahora dom, 18 de oct, 02:00 p. m. en Polideportivo del Sur.	/partidos/1d50a151-b0a5-47e7-a300-8f4e9a079ec9	f	c64db5ae-734e-4c12-bb38-578aca1d8dd6	c64db5ae-734e-4c12-bb38-578aca1d8dd6:ab7d9b35-97b6-4e00-b17e-ab915cd51696	2026-10-17 15:58:15.733
5f6664da-be89-4cf0-aee9-b4fdb0dc048c	cae1ef7a-182a-4de8-be5c-28ff8888cabc	\N	\N	MATCH_RESCHEDULED	Cambio de horario	Halcones FC vs Tigres del Sinú: ahora dom, 18 de oct, 02:00 p. m. en Polideportivo del Sur.	/partidos/1d50a151-b0a5-47e7-a300-8f4e9a079ec9	f	c64db5ae-734e-4c12-bb38-578aca1d8dd6	c64db5ae-734e-4c12-bb38-578aca1d8dd6:cae1ef7a-182a-4de8-be5c-28ff8888cabc	2026-10-17 15:58:15.733
ce965491-310f-40c0-a74b-b3e9baf85bda	\N	\N	ADMIN	USER_REGISTERED	Nuevo usuario registrado	Sofía Martínez (organizadora@demo.com) se registró como organizador.	/admin?tab=usuarios	f	abbfbd43-c2e8-4397-98ab-b4b186157214	abbfbd43-c2e8-4397-98ab-b4b186157214:ADMIN	2026-10-17 15:58:15.949
7260a006-635b-47e5-8d03-53810bb76bc4	\N	\N	ADMIN	LEAGUE_PENDING	Nueva liga pendiente de aprobación	Sofía Martínez creó la liga "Liga Femenina de Vóley Cereté". Revísala para autorizarla.	/admin?tab=ligas	f	0248c6ef-5367-4afa-9173-8661374c0c04	0248c6ef-5367-4afa-9173-8661374c0c04:ADMIN	2026-10-17 15:58:15.972
f326cb05-70b0-4ff3-8587-e588792f1c25	\N	\N	ADMIN	LEAGUE_PENDING	Nueva liga pendiente de aprobación	Sofía Martínez creó la liga "Torneo Relámpago de Básquet Sahagún". Revísala para autorizarla.	/admin?tab=ligas	f	b900f4de-66e3-4ac9-9ccb-68f09f4eba48	b900f4de-66e3-4ac9-9ccb-68f09f4eba48:ADMIN	2026-10-17 15:58:15.994
\.


--
-- Data for Name: preferences; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.preferences (user_id, email_enabled, push_enabled, updated_at) FROM stdin;
\.


--
-- Data for Name: subscriptions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.subscriptions (id, user_id, email, league_id, created_at) FROM stdin;
f1f08a1e-046f-4215-affe-5a27da6ee726	cae1ef7a-182a-4de8-be5c-28ff8888cabc	aficionado@demo.com	e1465a8b-d5b1-418e-abc1-9f5efba20c74	2026-10-17 15:58:05.341
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

\unrestrict Dt4ec0Pz4f1B6OJ2NhizkOLhvPTNJ7p4WHwKGqIKqelW47PTes20xbi3yJgn1u5

