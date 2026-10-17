--
-- PostgreSQL database dump
--

\restrict bbmVz0xaP2DdTp0FVHXlpBhKSKDAfxLXfZdIKSIM2JPctjXFqg7OnRm0CP1wacX

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

INSERT INTO public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) VALUES ('c6ecdd4a-64a9-457b-9247-6d0242f12ad0', 'b31f39a921b35eac37493e7fa7558ad7db17bf980d353351f366dc4547295d7e', '2026-10-17 15:57:49.914677+00', '20261011000000_init', NULL, NULL, '2026-10-17 15:57:49.635533+00', 1);


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.users (id, email, name, password_hash, role, status, last_login_at, created_at, updated_at) VALUES ('086e7c86-646b-49b4-8312-10ed398c47b5', 'admin@sportsleague.com', 'Administrador', '$2b$10$THJPrPvPkmqFekbMjEvcRuZgLyzKcPLpP1G3C1K3v443A18.NOGvu', 'ADMIN', 'ACTIVE', '2026-10-17 15:58:03.114', '2026-10-17 15:57:55.878', '2026-10-17 15:58:03.115');
INSERT INTO public.users (id, email, name, password_hash, role, status, last_login_at, created_at, updated_at) VALUES ('ab7d9b35-97b6-4e00-b17e-ab915cd51696', 'organizador@demo.com', 'Laura Gómez', '$2b$10$9J6LPqpXtYgVqQyyXkSy2uFYrMOXgk7wzc692vOJigv.nFi7iB3ye', 'ORGANIZER', 'ACTIVE', NULL, '2026-10-17 15:58:03.559', '2026-10-17 15:58:03.559');
INSERT INTO public.users (id, email, name, password_hash, role, status, last_login_at, created_at, updated_at) VALUES ('0d4fc7f4-d7be-4c79-89b7-1fca4b4d4e57', 'arbitro@demo.com', 'Mario Arroyo', '$2b$10$I.7p.O1M6G.Gdai80ZS00.hBCoQruFCDhhNLMCeLDFYfvhTEQ2vgO', 'REFEREE', 'ACTIVE', NULL, '2026-10-17 15:58:05.091', '2026-10-17 15:58:05.091');
INSERT INTO public.users (id, email, name, password_hash, role, status, last_login_at, created_at, updated_at) VALUES ('cae1ef7a-182a-4de8-be5c-28ff8888cabc', 'aficionado@demo.com', 'Camilo Ruiz', '$2b$10$BEOlE5y1pcOVI3Vixl.yg.D60gpwcf4lA9LYR4grewKdLzEFnF/nO', 'SPECTATOR', 'ACTIVE', NULL, '2026-10-17 15:58:05.307', '2026-10-17 15:58:05.307');
INSERT INTO public.users (id, email, name, password_hash, role, status, last_login_at, created_at, updated_at) VALUES ('61007903-b1b8-465c-a20c-2433908a92de', 'organizadora@demo.com', 'Sofía Martínez', '$2b$10$RPmIFQIXtUTTHDHfg3reB.6WcrD9PuarcYJ72zV/xwC3/4t1IAXYi', 'ORGANIZER', 'ACTIVE', NULL, '2026-10-17 15:58:15.942', '2026-10-17 15:58:15.942');


--
-- PostgreSQL database dump complete
--

\unrestrict bbmVz0xaP2DdTp0FVHXlpBhKSKDAfxLXfZdIKSIM2JPctjXFqg7OnRm0CP1wacX

