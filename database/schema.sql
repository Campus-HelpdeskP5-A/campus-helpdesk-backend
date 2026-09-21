--
-- PostgreSQL database dump
--

\restrict hM5YnCAYhX4sABrP4cUQRFh6jbAjJT1pwMLD8kTKZVQNbrchYDmJykY3ZhqcQYY

-- Dumped from database version 18.6
-- Dumped by pg_dump version 18.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: ai_model_version; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_model_version (
    model_version_id integer NOT NULL,
    model_name character varying(150) NOT NULL,
    version character varying(100) NOT NULL,
    model_type character varying(100) NOT NULL,
    task character varying(150) NOT NULL,
    dataset_version character varying(100),
    metric_name character varying(100),
    metric_value numeric,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: ai_model_version_model_version_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.ai_model_version ALTER COLUMN model_version_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.ai_model_version_model_version_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: app_user; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_user (
    user_id uuid DEFAULT gen_random_uuid() NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    full_name character varying(255) NOT NULL,
    role_id integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: asset_reference; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.asset_reference (
    asset_id character varying(100) NOT NULL,
    asset_tag character varying(150) NOT NULL,
    label character varying(255) NOT NULL,
    location_id integer NOT NULL,
    status character varying(50) NOT NULL
);


--
-- Name: assignment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assignment (
    assignment_id uuid DEFAULT gen_random_uuid() NOT NULL,
    ticket_id uuid NOT NULL,
    team_id integer NOT NULL,
    assignee_id uuid,
    assigned_by uuid NOT NULL,
    assigned_at timestamp with time zone DEFAULT now() NOT NULL,
    unassigned_at timestamp with time zone,
    reason text
);


--
-- Name: attachment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.attachment (
    attachment_id uuid DEFAULT gen_random_uuid() NOT NULL,
    ticket_id uuid,
    comment_id uuid,
    file_uuid uuid NOT NULL,
    file_path character varying(500) NOT NULL,
    original_name character varying(255) NOT NULL,
    file_type character varying(100),
    file_size bigint NOT NULL,
    uploaded_by uuid NOT NULL,
    is_internal boolean DEFAULT false NOT NULL,
    submitted_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_attachment_single_parent CHECK ((((ticket_id IS NOT NULL) AND (comment_id IS NULL)) OR ((ticket_id IS NULL) AND (comment_id IS NOT NULL))))
);


--
-- Name: audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log (
    log_id uuid DEFAULT gen_random_uuid() NOT NULL,
    actor_id uuid,
    action character varying(100) NOT NULL,
    entity_type character varying(100) NOT NULL,
    entity_id character varying(255) NOT NULL,
    ip_address inet,
    "timestamp" timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: business_hours; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.business_hours (
    business_hours_id integer NOT NULL,
    name character varying(150) NOT NULL,
    timezone character varying(100) NOT NULL,
    created_by uuid,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: business_hours_business_hours_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.business_hours ALTER COLUMN business_hours_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.business_hours_business_hours_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: business_hours_schedule; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.business_hours_schedule (
    schedule_id integer NOT NULL,
    business_hours_id integer NOT NULL,
    day_of_week character varying(20) NOT NULL,
    start_time time without time zone,
    end_time time without time zone,
    is_working_day boolean DEFAULT true NOT NULL,
    created_by uuid,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: business_hours_schedule_schedule_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.business_hours_schedule ALTER COLUMN schedule_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.business_hours_schedule_schedule_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: category; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.category (
    category_id integer NOT NULL,
    category_name character varying(150) NOT NULL,
    default_team_id integer,
    created_by uuid,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: category_category_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.category ALTER COLUMN category_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.category_category_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: comment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.comment (
    comment_id uuid DEFAULT gen_random_uuid() NOT NULL,
    ticket_id uuid NOT NULL,
    author_id uuid NOT NULL,
    content text NOT NULL,
    is_internal boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: escalation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.escalation (
    escalation_id uuid DEFAULT gen_random_uuid() NOT NULL,
    ticket_id uuid NOT NULL,
    from_team_id integer,
    to_team_id integer NOT NULL,
    escalated_by uuid NOT NULL,
    escalation_type character varying(100) NOT NULL,
    reason text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    resolved_at timestamp with time zone
);


--
-- Name: feedback; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.feedback (
    feedback_id uuid DEFAULT gen_random_uuid() NOT NULL,
    ticket_id uuid NOT NULL,
    user_id uuid NOT NULL,
    rating smallint NOT NULL,
    confirmation_status character varying(50) NOT NULL,
    reopened_reason text,
    comment text,
    submitted_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: location; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.location (
    location_id integer NOT NULL,
    building character varying(150) NOT NULL,
    floor character varying(50),
    room_code character varying(100) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: location_location_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.location ALTER COLUMN location_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.location_location_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: prediction; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.prediction (
    prediction_id uuid DEFAULT gen_random_uuid() NOT NULL,
    ticket_id uuid NOT NULL,
    prediction_type character varying(100) NOT NULL,
    predicted_value character varying(255) NOT NULL,
    confidence numeric,
    explanation text,
    model_version_id integer NOT NULL,
    decision character varying(100),
    decided_by uuid,
    decided_at timestamp with time zone,
    override_reason text,
    actual_outcome character varying(255),
    evaluated_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: priority_matrix; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.priority_matrix (
    priority_matrix_id integer NOT NULL,
    urgency character varying(50) NOT NULL,
    impact character varying(50) NOT NULL,
    priority character varying(50) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by uuid,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: priority_matrix_priority_matrix_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.priority_matrix ALTER COLUMN priority_matrix_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.priority_matrix_priority_matrix_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: role; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.role (
    role_id integer NOT NULL,
    role_name character varying(100) NOT NULL
);


--
-- Name: role_role_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.role ALTER COLUMN role_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.role_role_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: sla_profile; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sla_profile (
    sla_profile_id integer NOT NULL,
    profile_name character varying(150) NOT NULL,
    priority character varying(50) NOT NULL,
    response_target_minutes integer NOT NULL,
    resolution_target_minutes integer NOT NULL,
    business_hours_id integer NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by uuid,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: sla_profile_sla_profile_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.sla_profile ALTER COLUMN sla_profile_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.sla_profile_sla_profile_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: status_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.status_history (
    history_id uuid DEFAULT gen_random_uuid() NOT NULL,
    ticket_id uuid NOT NULL,
    changed_by uuid NOT NULL,
    old_status character varying(50),
    new_status character varying(50) NOT NULL,
    reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: support_team; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.support_team (
    team_id integer NOT NULL,
    team_name character varying(150) NOT NULL,
    description text,
    is_active boolean DEFAULT true NOT NULL,
    created_by uuid,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: support_team_team_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.support_team ALTER COLUMN team_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.support_team_team_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: ticket; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ticket (
    ticket_id uuid DEFAULT gen_random_uuid() NOT NULL,
    reference_number character varying(100) NOT NULL,
    reporter_id uuid NOT NULL,
    created_by uuid NOT NULL,
    updated_by uuid NOT NULL,
    category_id integer NOT NULL,
    location_id integer NOT NULL,
    asset_id character varying(100),
    priority_matrix_id integer NOT NULL,
    sla_profile_id integer NOT NULL,
    title character varying(255) NOT NULL,
    description text NOT NULL,
    urgency character varying(50) NOT NULL,
    impact character varying(50) NOT NULL,
    priority character varying(50) NOT NULL,
    status character varying(50) NOT NULL,
    response_target_minutes integer NOT NULL,
    resolution_target_minutes integer NOT NULL,
    first_response_at timestamp with time zone,
    response_due_at timestamp with time zone,
    resolution_due_at timestamp with time zone,
    resolved_at timestamp with time zone,
    closed_at timestamp with time zone,
    requester_verified_at timestamp with time zone,
    requester_verified_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_ticket_closed_verification CHECK ((((status)::text <> 'closed'::text) OR ((requester_verified_at IS NOT NULL) AND (requester_verified_by IS NOT NULL))))
);


--
-- Name: ticket_relation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ticket_relation (
    relation_id uuid DEFAULT gen_random_uuid() NOT NULL,
    source_ticket_id uuid NOT NULL,
    target_ticket_id uuid NOT NULL,
    relation_type character varying(100) NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_ticket_relation_different_tickets CHECK ((source_ticket_id <> target_ticket_id))
);


--
-- Name: work_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.work_log (
    work_log_id uuid DEFAULT gen_random_uuid() NOT NULL,
    ticket_id uuid NOT NULL,
    technician_id uuid NOT NULL,
    diagnosis text,
    actions_taken text,
    parts_used text,
    time_spent_minutes integer,
    resolution_code character varying(100),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: ai_model_version ai_model_version_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_model_version
    ADD CONSTRAINT ai_model_version_pkey PRIMARY KEY (model_version_id);


--
-- Name: app_user app_user_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_user
    ADD CONSTRAINT app_user_email_key UNIQUE (email);


--
-- Name: app_user app_user_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_user
    ADD CONSTRAINT app_user_pkey PRIMARY KEY (user_id);


--
-- Name: asset_reference asset_reference_asset_tag_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_reference
    ADD CONSTRAINT asset_reference_asset_tag_key UNIQUE (asset_tag);


--
-- Name: asset_reference asset_reference_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_reference
    ADD CONSTRAINT asset_reference_pkey PRIMARY KEY (asset_id);


--
-- Name: assignment assignment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignment
    ADD CONSTRAINT assignment_pkey PRIMARY KEY (assignment_id);


--
-- Name: attachment attachment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attachment
    ADD CONSTRAINT attachment_pkey PRIMARY KEY (attachment_id);


--
-- Name: audit_log audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (log_id);


--
-- Name: business_hours business_hours_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_hours
    ADD CONSTRAINT business_hours_pkey PRIMARY KEY (business_hours_id);


--
-- Name: business_hours_schedule business_hours_schedule_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_hours_schedule
    ADD CONSTRAINT business_hours_schedule_pkey PRIMARY KEY (schedule_id);


--
-- Name: category category_category_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.category
    ADD CONSTRAINT category_category_name_key UNIQUE (category_name);


--
-- Name: category category_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.category
    ADD CONSTRAINT category_pkey PRIMARY KEY (category_id);


--
-- Name: comment comment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comment
    ADD CONSTRAINT comment_pkey PRIMARY KEY (comment_id);


--
-- Name: escalation escalation_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.escalation
    ADD CONSTRAINT escalation_pkey PRIMARY KEY (escalation_id);


--
-- Name: feedback feedback_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feedback
    ADD CONSTRAINT feedback_pkey PRIMARY KEY (feedback_id);


--
-- Name: feedback feedback_ticket_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feedback
    ADD CONSTRAINT feedback_ticket_id_key UNIQUE (ticket_id);


--
-- Name: location location_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.location
    ADD CONSTRAINT location_pkey PRIMARY KEY (location_id);


--
-- Name: prediction prediction_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prediction
    ADD CONSTRAINT prediction_pkey PRIMARY KEY (prediction_id);


--
-- Name: priority_matrix priority_matrix_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.priority_matrix
    ADD CONSTRAINT priority_matrix_pkey PRIMARY KEY (priority_matrix_id);


--
-- Name: role role_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role
    ADD CONSTRAINT role_pkey PRIMARY KEY (role_id);


--
-- Name: role role_role_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role
    ADD CONSTRAINT role_role_name_key UNIQUE (role_name);


--
-- Name: sla_profile sla_profile_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sla_profile
    ADD CONSTRAINT sla_profile_pkey PRIMARY KEY (sla_profile_id);


--
-- Name: status_history status_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.status_history
    ADD CONSTRAINT status_history_pkey PRIMARY KEY (history_id);


--
-- Name: support_team support_team_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_team
    ADD CONSTRAINT support_team_pkey PRIMARY KEY (team_id);


--
-- Name: support_team support_team_team_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_team
    ADD CONSTRAINT support_team_team_name_key UNIQUE (team_name);


--
-- Name: ticket ticket_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket
    ADD CONSTRAINT ticket_pkey PRIMARY KEY (ticket_id);


--
-- Name: ticket ticket_reference_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket
    ADD CONSTRAINT ticket_reference_number_key UNIQUE (reference_number);


--
-- Name: ticket_relation ticket_relation_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_relation
    ADD CONSTRAINT ticket_relation_pkey PRIMARY KEY (relation_id);


--
-- Name: ticket_relation uq_ticket_relation_target_type; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_relation
    ADD CONSTRAINT uq_ticket_relation_target_type UNIQUE (target_ticket_id, relation_type);


--
-- Name: work_log work_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_log
    ADD CONSTRAINT work_log_pkey PRIMARY KEY (work_log_id);


--
-- Name: uq_priority_matrix_active; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_priority_matrix_active ON public.priority_matrix USING btree (urgency, impact) WHERE (is_active = true);


--
-- Name: asset_reference fk_asset_location; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_reference
    ADD CONSTRAINT fk_asset_location FOREIGN KEY (location_id) REFERENCES public.location(location_id);


--
-- Name: assignment fk_assignment_assigned_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignment
    ADD CONSTRAINT fk_assignment_assigned_by FOREIGN KEY (assigned_by) REFERENCES public.app_user(user_id);


--
-- Name: assignment fk_assignment_assignee; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignment
    ADD CONSTRAINT fk_assignment_assignee FOREIGN KEY (assignee_id) REFERENCES public.app_user(user_id);


--
-- Name: assignment fk_assignment_team; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignment
    ADD CONSTRAINT fk_assignment_team FOREIGN KEY (team_id) REFERENCES public.support_team(team_id);


--
-- Name: assignment fk_assignment_ticket; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignment
    ADD CONSTRAINT fk_assignment_ticket FOREIGN KEY (ticket_id) REFERENCES public.ticket(ticket_id);


--
-- Name: attachment fk_attachment_comment; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attachment
    ADD CONSTRAINT fk_attachment_comment FOREIGN KEY (comment_id) REFERENCES public.comment(comment_id);


--
-- Name: attachment fk_attachment_ticket; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attachment
    ADD CONSTRAINT fk_attachment_ticket FOREIGN KEY (ticket_id) REFERENCES public.ticket(ticket_id);


--
-- Name: attachment fk_attachment_uploaded_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attachment
    ADD CONSTRAINT fk_attachment_uploaded_by FOREIGN KEY (uploaded_by) REFERENCES public.app_user(user_id);


--
-- Name: audit_log fk_audit_log_actor; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT fk_audit_log_actor FOREIGN KEY (actor_id) REFERENCES public.app_user(user_id);


--
-- Name: business_hours fk_business_hours_created_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_hours
    ADD CONSTRAINT fk_business_hours_created_by FOREIGN KEY (created_by) REFERENCES public.app_user(user_id);


--
-- Name: business_hours fk_business_hours_updated_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_hours
    ADD CONSTRAINT fk_business_hours_updated_by FOREIGN KEY (updated_by) REFERENCES public.app_user(user_id);


--
-- Name: category fk_category_created_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.category
    ADD CONSTRAINT fk_category_created_by FOREIGN KEY (created_by) REFERENCES public.app_user(user_id);


--
-- Name: category fk_category_default_team; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.category
    ADD CONSTRAINT fk_category_default_team FOREIGN KEY (default_team_id) REFERENCES public.support_team(team_id);


--
-- Name: category fk_category_updated_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.category
    ADD CONSTRAINT fk_category_updated_by FOREIGN KEY (updated_by) REFERENCES public.app_user(user_id);


--
-- Name: comment fk_comment_author; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comment
    ADD CONSTRAINT fk_comment_author FOREIGN KEY (author_id) REFERENCES public.app_user(user_id);


--
-- Name: comment fk_comment_ticket; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comment
    ADD CONSTRAINT fk_comment_ticket FOREIGN KEY (ticket_id) REFERENCES public.ticket(ticket_id);


--
-- Name: escalation fk_escalation_escalated_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.escalation
    ADD CONSTRAINT fk_escalation_escalated_by FOREIGN KEY (escalated_by) REFERENCES public.app_user(user_id);


--
-- Name: escalation fk_escalation_from_team; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.escalation
    ADD CONSTRAINT fk_escalation_from_team FOREIGN KEY (from_team_id) REFERENCES public.support_team(team_id);


--
-- Name: escalation fk_escalation_ticket; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.escalation
    ADD CONSTRAINT fk_escalation_ticket FOREIGN KEY (ticket_id) REFERENCES public.ticket(ticket_id);


--
-- Name: escalation fk_escalation_to_team; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.escalation
    ADD CONSTRAINT fk_escalation_to_team FOREIGN KEY (to_team_id) REFERENCES public.support_team(team_id);


--
-- Name: feedback fk_feedback_ticket; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feedback
    ADD CONSTRAINT fk_feedback_ticket FOREIGN KEY (ticket_id) REFERENCES public.ticket(ticket_id);


--
-- Name: feedback fk_feedback_user; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feedback
    ADD CONSTRAINT fk_feedback_user FOREIGN KEY (user_id) REFERENCES public.app_user(user_id);


--
-- Name: prediction fk_prediction_decided_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prediction
    ADD CONSTRAINT fk_prediction_decided_by FOREIGN KEY (decided_by) REFERENCES public.app_user(user_id);


--
-- Name: prediction fk_prediction_model_version; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prediction
    ADD CONSTRAINT fk_prediction_model_version FOREIGN KEY (model_version_id) REFERENCES public.ai_model_version(model_version_id);


--
-- Name: prediction fk_prediction_ticket; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prediction
    ADD CONSTRAINT fk_prediction_ticket FOREIGN KEY (ticket_id) REFERENCES public.ticket(ticket_id);


--
-- Name: priority_matrix fk_priority_matrix_created_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.priority_matrix
    ADD CONSTRAINT fk_priority_matrix_created_by FOREIGN KEY (created_by) REFERENCES public.app_user(user_id);


--
-- Name: priority_matrix fk_priority_matrix_updated_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.priority_matrix
    ADD CONSTRAINT fk_priority_matrix_updated_by FOREIGN KEY (updated_by) REFERENCES public.app_user(user_id);


--
-- Name: business_hours_schedule fk_schedule_business_hours; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_hours_schedule
    ADD CONSTRAINT fk_schedule_business_hours FOREIGN KEY (business_hours_id) REFERENCES public.business_hours(business_hours_id);


--
-- Name: business_hours_schedule fk_schedule_created_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_hours_schedule
    ADD CONSTRAINT fk_schedule_created_by FOREIGN KEY (created_by) REFERENCES public.app_user(user_id);


--
-- Name: business_hours_schedule fk_schedule_updated_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_hours_schedule
    ADD CONSTRAINT fk_schedule_updated_by FOREIGN KEY (updated_by) REFERENCES public.app_user(user_id);


--
-- Name: sla_profile fk_sla_profile_business_hours; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sla_profile
    ADD CONSTRAINT fk_sla_profile_business_hours FOREIGN KEY (business_hours_id) REFERENCES public.business_hours(business_hours_id);


--
-- Name: sla_profile fk_sla_profile_created_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sla_profile
    ADD CONSTRAINT fk_sla_profile_created_by FOREIGN KEY (created_by) REFERENCES public.app_user(user_id);


--
-- Name: sla_profile fk_sla_profile_updated_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sla_profile
    ADD CONSTRAINT fk_sla_profile_updated_by FOREIGN KEY (updated_by) REFERENCES public.app_user(user_id);


--
-- Name: status_history fk_status_history_changed_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.status_history
    ADD CONSTRAINT fk_status_history_changed_by FOREIGN KEY (changed_by) REFERENCES public.app_user(user_id);


--
-- Name: status_history fk_status_history_ticket; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.status_history
    ADD CONSTRAINT fk_status_history_ticket FOREIGN KEY (ticket_id) REFERENCES public.ticket(ticket_id);


--
-- Name: support_team fk_support_team_created_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_team
    ADD CONSTRAINT fk_support_team_created_by FOREIGN KEY (created_by) REFERENCES public.app_user(user_id);


--
-- Name: support_team fk_support_team_updated_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_team
    ADD CONSTRAINT fk_support_team_updated_by FOREIGN KEY (updated_by) REFERENCES public.app_user(user_id);


--
-- Name: ticket fk_ticket_asset; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket
    ADD CONSTRAINT fk_ticket_asset FOREIGN KEY (asset_id) REFERENCES public.asset_reference(asset_id);


--
-- Name: ticket fk_ticket_category; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket
    ADD CONSTRAINT fk_ticket_category FOREIGN KEY (category_id) REFERENCES public.category(category_id);


--
-- Name: ticket fk_ticket_created_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket
    ADD CONSTRAINT fk_ticket_created_by FOREIGN KEY (created_by) REFERENCES public.app_user(user_id);


--
-- Name: ticket fk_ticket_location; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket
    ADD CONSTRAINT fk_ticket_location FOREIGN KEY (location_id) REFERENCES public.location(location_id);


--
-- Name: ticket fk_ticket_priority_matrix; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket
    ADD CONSTRAINT fk_ticket_priority_matrix FOREIGN KEY (priority_matrix_id) REFERENCES public.priority_matrix(priority_matrix_id);


--
-- Name: ticket_relation fk_ticket_relation_created_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_relation
    ADD CONSTRAINT fk_ticket_relation_created_by FOREIGN KEY (created_by) REFERENCES public.app_user(user_id);


--
-- Name: ticket_relation fk_ticket_relation_source; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_relation
    ADD CONSTRAINT fk_ticket_relation_source FOREIGN KEY (source_ticket_id) REFERENCES public.ticket(ticket_id);


--
-- Name: ticket_relation fk_ticket_relation_target; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_relation
    ADD CONSTRAINT fk_ticket_relation_target FOREIGN KEY (target_ticket_id) REFERENCES public.ticket(ticket_id);


--
-- Name: ticket fk_ticket_reporter; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket
    ADD CONSTRAINT fk_ticket_reporter FOREIGN KEY (reporter_id) REFERENCES public.app_user(user_id);


--
-- Name: ticket fk_ticket_requester_verified_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket
    ADD CONSTRAINT fk_ticket_requester_verified_by FOREIGN KEY (requester_verified_by) REFERENCES public.app_user(user_id);


--
-- Name: ticket fk_ticket_sla_profile; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket
    ADD CONSTRAINT fk_ticket_sla_profile FOREIGN KEY (sla_profile_id) REFERENCES public.sla_profile(sla_profile_id);


--
-- Name: ticket fk_ticket_updated_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket
    ADD CONSTRAINT fk_ticket_updated_by FOREIGN KEY (updated_by) REFERENCES public.app_user(user_id);


--
-- Name: app_user fk_user_role; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_user
    ADD CONSTRAINT fk_user_role FOREIGN KEY (role_id) REFERENCES public.role(role_id);


--
-- Name: work_log fk_work_log_technician; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_log
    ADD CONSTRAINT fk_work_log_technician FOREIGN KEY (technician_id) REFERENCES public.app_user(user_id);


--
-- Name: work_log fk_work_log_ticket; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_log
    ADD CONSTRAINT fk_work_log_ticket FOREIGN KEY (ticket_id) REFERENCES public.ticket(ticket_id);


--
-- PostgreSQL database dump complete
--

\unrestrict hM5YnCAYhX4sABrP4cUQRFh6jbAjJT1pwMLD8kTKZVQNbrchYDmJykY3ZhqcQYY
