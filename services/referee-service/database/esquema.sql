--
-- PostgreSQL database dump
--

\restrict XdLlNu4fPdPuZfvN6f5gxnN19rexmbg3Y59LGdwdioe7TWFyqlO6B2EHjHJGSur

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

\unrestrict XdLlNu4fPdPuZfvN6f5gxnN19rexmbg3Y59LGdwdioe7TWFyqlO6B2EHjHJGSur

