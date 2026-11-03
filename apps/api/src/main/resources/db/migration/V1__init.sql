create table users (
    id uuid primary key,
    email varchar(320) not null unique,
    display_name varchar(80) not null,
    role varchar(20) not null,
    created_at timestamptz not null,
    last_login_at timestamptz
);

create table email_codes (
    id uuid primary key,
    email varchar(320) not null,
    code_hash varchar(64) not null,
    expires_at timestamptz not null,
    consumed_at timestamptz,
    attempts integer not null default 0,
    ip_hash varchar(64),
    created_at timestamptz not null
);

create index idx_email_codes_email_created on email_codes (email, created_at desc);
create index idx_email_codes_expires on email_codes (expires_at);

create table posts (
    id uuid primary key,
    slug varchar(160) not null unique,
    title varchar(200) not null,
    excerpt varchar(400) not null,
    content text not null,
    cover_url varchar(1000),
    status varchar(20) not null,
    tags text,
    view_count bigint not null default 0,
    published_at timestamptz,
    created_at timestamptz not null,
    updated_at timestamptz not null
);

create index idx_posts_status_published on posts (status, published_at desc);

create table page_views (
    id uuid primary key,
    path varchar(500) not null,
    referrer varchar(1000),
    visitor_id varchar(64) not null,
    session_id varchar(64),
    user_agent varchar(500),
    ip_hash varchar(64),
    created_at timestamptz not null
);

create index idx_page_views_created on page_views (created_at desc);
create index idx_page_views_visitor on page_views (visitor_id, created_at);
create index idx_page_views_path on page_views (path);

create table media_assets (
    id uuid primary key,
    object_key varchar(500) not null,
    url varchar(1000) not null,
    original_name varchar(255) not null,
    content_type varchar(100) not null,
    size_bytes bigint not null,
    created_at timestamptz not null
);
