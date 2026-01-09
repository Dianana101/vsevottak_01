-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.analytics
(
    id                 uuid                     NOT NULL DEFAULT gen_random_uuid(),
    post_id            uuid                     NOT NULL,
    instagram_media_id text                     NOT NULL,
    likes              integer                           DEFAULT 0,
    comments           integer                           DEFAULT 0,
    saves              integer                           DEFAULT 0,
    shares             integer                           DEFAULT 0,
    reach              integer                           DEFAULT 0,
    impressions        integer                           DEFAULT 0,
    engagement_rate    numeric                           DEFAULT 0.00,
    fetched_at         timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    created_at         timestamp with time zone          DEFAULT timezone('utc'::text, now()),
    CONSTRAINT analytics_pkey PRIMARY KEY (id),
    CONSTRAINT analytics_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts (id)
);
CREATE TABLE public.auth_logs
(
    id         bigint NOT NULL          DEFAULT nextval('auth_logs_id_seq'::regclass),
    user_id    uuid,
    event      text   NOT NULL,
    payload    jsonb,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    CONSTRAINT auth_logs_pkey PRIMARY KEY (id)
);
CREATE TABLE public.posts
(
    id                     uuid                     NOT NULL DEFAULT gen_random_uuid(),
    user_id                uuid,
    schedule_id            uuid,
    image_url              text,
    caption                character varying,
    status                 text                              DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'published'::text, 'failed'::text])),
    instagram_media_id     text,
    scheduled_at           timestamp with time zone NOT NULL,
    published_at           timestamp with time zone,
    error_message          text,
    created_at             timestamp with time zone          DEFAULT timezone('utc'::text, now()),
    topic                  text                     NOT NULL DEFAULT 'Новый пост'::text,
    bg_color               text                     NOT NULL DEFAULT '#FFFFFF'::text CHECK (bg_color ~* '^#[0-9A-F]{6}$'::text),
    retry_count            integer                           DEFAULT 0,
    instagram_container_id text,
    updated_at             timestamp with time zone          DEFAULT now(),
    CONSTRAINT posts_pkey PRIMARY KEY (id),
    CONSTRAINT posts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users (id),
    CONSTRAINT posts_schedule_id_fkey FOREIGN KEY (schedule_id) REFERENCES public.schedules (id)
);
CREATE TABLE public.schedules
(
    id          uuid NOT NULL            DEFAULT gen_random_uuid(),
    user_id     uuid,
    type USER-DEFINED NOT NULL,
    topic       text NOT NULL,
    bg_color    text NOT NULL,
    time_of_day time without time zone,
    run_at      timestamp with time zone,
    is_active   boolean                  DEFAULT true,
    created_at  timestamp with time zone DEFAULT timezone('utc'::text, now()),
    CONSTRAINT schedules_pkey PRIMARY KEY (id),
    CONSTRAINT schedules_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users (id)
);
CREATE TABLE public.users
(
    id                  uuid NOT NULL            DEFAULT gen_random_uuid(),
    email               text,
    created_at          timestamp with time zone DEFAULT timezone('utc'::text, now()),
    ig_user_id          text UNIQUE,
    ig_username         text,
    fb_page_id          text,
    ig_access_token     text,
    ig_token_expires_at timestamp with time zone,
    CONSTRAINT users_pkey PRIMARY KEY (id)
);
