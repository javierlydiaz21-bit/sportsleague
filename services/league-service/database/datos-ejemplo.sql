--
-- PostgreSQL database dump
--

\restrict dGzKldvDFvMfEN0asJgeINWVKEMy2YzIHMkLjaD1visCF5LctR2WyMsstEq1Phj

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
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) VALUES ('d1039a20-c064-4ce1-9ee3-878138107e39', 'f5c2c61fcabe06031f64b47ff9431659dc97197133903d239aa7e9522fd32deb', '2026-10-17 15:57:51.970328+00', '20261011000000_init', NULL, NULL, '2026-10-17 15:57:51.598449+00', 1);


--
-- Data for Name: leagues; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.leagues (id, name, sport, description, city, owner_id, owner_name, status, review_note, reviewed_by, reviewed_at, created_at, updated_at) VALUES ('e1465a8b-d5b1-418e-abc1-9f5efba20c74', 'Liga Amateur de Montería', 'FOOTBALL', 'Torneo de fútbol aficionado del valle del Sinú. Seis equipos, ida y vuelta, partidos los domingos.', 'Montería', 'ab7d9b35-97b6-4e00-b17e-ab915cd51696', 'Laura Gómez', 'APPROVED', 'Documentación de la liga verificada', '086e7c86-646b-49b4-8312-10ed398c47b5', '2026-10-17 15:58:03.704', '2026-10-17 15:58:03.66', '2026-10-17 15:58:03.706');
INSERT INTO public.leagues (id, name, sport, description, city, owner_id, owner_name, status, review_note, reviewed_by, reviewed_at, created_at, updated_at) VALUES ('00eaa6a9-e01b-481f-b5da-e35fce61697f', 'Liga Femenina de Vóley Cereté', 'VOLLEYBALL', 'Ocho clubes de vóley femenino.', 'Cereté', '61007903-b1b8-465c-a20c-2433908a92de', 'Sofía Martínez', 'PENDING', NULL, NULL, NULL, '2026-10-17 15:58:15.966', '2026-10-17 15:58:15.966');
INSERT INTO public.leagues (id, name, sport, description, city, owner_id, owner_name, status, review_note, reviewed_by, reviewed_at, created_at, updated_at) VALUES ('eda8ca2a-afb5-4b65-97cc-e7b7a7dd67ac', 'Torneo Relámpago de Básquet Sahagún', 'BASKETBALL', NULL, 'Sahagún', '61007903-b1b8-465c-a20c-2433908a92de', 'Sofía Martínez', 'PENDING', NULL, NULL, NULL, '2026-10-17 15:58:15.988', '2026-10-17 15:58:15.988');


--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.categories (id, league_id, name, min_age, max_age, created_at) VALUES ('719a94f9-95a7-43d3-ba07-2f907d87c038', 'e1465a8b-d5b1-418e-abc1-9f5efba20c74', 'Libre', 16, 45, '2026-10-17 15:58:03.807');


--
-- Data for Name: rules; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.rules (id, category_id, points_win, points_draw, points_loss, tiebreaker_criteria, updated_at) VALUES ('1393dd5f-5c73-4c2b-a6ba-ee03a730eb92', '719a94f9-95a7-43d3-ba07-2f907d87c038', 3, 1, 0, '{GOAL_DIFFERENCE,GOALS_FOR,HEAD_TO_HEAD}', '2026-10-17 15:58:03.807');


--
-- Data for Name: seasons; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.seasons (id, league_id, name, year, start_date, end_date, created_at) VALUES ('e05bb80b-7ebf-4d20-bb7a-3933d9cb36cf', 'e1465a8b-d5b1-418e-abc1-9f5efba20c74', 'Apertura 2026', 2026, '2026-08-30', '2026-12-13', '2026-10-17 15:58:03.755');


--
-- Data for Name: venues; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.venues (id, league_id, name, address, zone, available_days, open_time, close_time, created_at) VALUES ('2c8a9776-a71a-4b29-a20b-eda40aeece3e', 'e1465a8b-d5b1-418e-abc1-9f5efba20c74', 'Estadio Municipal de Montería', 'Cra. 6 # 30-15', 'Centro', '{0,6}', '08:00', '18:00', '2026-10-17 15:58:03.868');
INSERT INTO public.venues (id, league_id, name, address, zone, available_days, open_time, close_time, created_at) VALUES ('af04cb38-0151-4f6b-adc9-f969302ba382', 'e1465a8b-d5b1-418e-abc1-9f5efba20c74', 'Cancha La Ribera', 'Av. Primera, Ronda del Sinú', 'Norte', '{6}', '08:00', '16:00', '2026-10-17 15:58:03.898');
INSERT INTO public.venues (id, league_id, name, address, zone, available_days, open_time, close_time, created_at) VALUES ('c0898445-bca0-43f8-ad8f-960eacbd8e33', 'e1465a8b-d5b1-418e-abc1-9f5efba20c74', 'Polideportivo del Sur', 'Calle 41 Sur', 'Sur', '{0,3}', '14:00', '20:00', '2026-10-17 15:58:03.923');


--
-- PostgreSQL database dump complete
--

\unrestrict dGzKldvDFvMfEN0asJgeINWVKEMy2YzIHMkLjaD1visCF5LctR2WyMsstEq1Phj

