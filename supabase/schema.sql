-- ============================================================
-- TRENCHER — Supabase Schema
-- Run this in your Supabase SQL Editor
-- Project: https://wwlomifjbgblcvjhggdb.supabase.co
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ── TOKENS TABLE ─────────────────────────────────────────────
create table if not exists tokens (
  id            uuid default uuid_generate_v4() primary key,
  address       text unique not null,
  name          text,
  symbol        text,
  score         integer default 0,
  grade         text default 'C' check (grade in ('S','A','B','C')),
  flags         text[] default '{}',

  -- Price & market data
  price_usd         numeric(30, 18) default 0,
  price_change_5m   numeric(10, 4) default 0,
  price_change_1h   numeric(10, 4) default 0,
  liquidity_usd     numeric(20, 4) default 0,
  fdv               numeric(20, 4) default 0,
  market_cap        numeric(20, 4) default 0,
  volume_5m         numeric(20, 4) default 0,
  volume_1h         numeric(20, 4) default 0,
  buys_5m           integer default 0,
  sells_5m          integer default 0,
  buy_ratio_5m      numeric(5, 4) default 0.5,

  -- Holder data
  holder_count      integer default 0,
  top10_pct         numeric(6, 2) default 0,
  smart_money_count integer default 0,

  -- Metadata
  pair_address      text,
  image_url         text,
  has_twitter       boolean default false,
  has_telegram      boolean default false,
  has_website       boolean default false,
  source            text default 'pump.fun',
  dex_url           text,

  -- Timestamps
  pair_created_at   timestamptz,
  detected_at       timestamptz default now(),
  scored_at         timestamptz default now(),
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

-- ── ALERTS TABLE ─────────────────────────────────────────────
create table if not exists alerts (
  id             uuid default uuid_generate_v4() primary key,
  token_address  text not null references tokens(address),
  token_symbol   text,
  grade          text not null,
  score          integer not null,
  flags          text[] default '{}',
  price_at_alert numeric(30, 18) default 0,
  fdv_at_alert   numeric(20, 4) default 0,
  alerted_at     timestamptz default now()
);

-- ── SMART WALLETS TABLE ───────────────────────────────────────
create table if not exists smart_wallets (
  id            uuid default uuid_generate_v4() primary key,
  address       text unique not null,
  label         text,
  win_count     integer default 0,
  total_pnl_usd numeric(20, 4) default 0,
  added_at      timestamptz default now(),
  last_seen_at  timestamptz default now()
);

-- ── STATS TABLE (daily rollup) ────────────────────────────────
create table if not exists daily_stats (
  id             uuid default uuid_generate_v4() primary key,
  date           date unique not null default current_date,
  tokens_scanned integer default 0,
  grade_s_count  integer default 0,
  grade_a_count  integer default 0,
  grade_b_count  integer default 0,
  grade_c_count  integer default 0,
  alerts_sent    integer default 0
);

-- ── INDEXES ───────────────────────────────────────────────────
create index if not exists idx_tokens_grade     on tokens(grade);
create index if not exists idx_tokens_scored_at on tokens(scored_at desc);
create index if not exists idx_tokens_score     on tokens(score desc);
create index if not exists idx_alerts_alerted   on alerts(alerted_at desc);

-- ── ROW LEVEL SECURITY (public read) ─────────────────────────
alter table tokens        enable row level security;
alter table alerts        enable row level security;
alter table smart_wallets enable row level security;
alter table daily_stats   enable row level security;

-- Public read access (dashboard can read without auth)
create policy "Public read tokens"
  on tokens for select using (true);

create policy "Public read alerts"
  on alerts for select using (true);

create policy "Public read stats"
  on daily_stats for select using (true);

-- Service role has full access (scanner backend)
create policy "Service write tokens"
  on tokens for all using (auth.role() = 'service_role');

create policy "Service write alerts"
  on alerts for all using (auth.role() = 'service_role');

create policy "Service write smart_wallets"
  on smart_wallets for all using (auth.role() = 'service_role');

create policy "Service write stats"
  on daily_stats for all using (auth.role() = 'service_role');

-- ── UPDATED_AT TRIGGER ────────────────────────────────────────
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger tokens_updated_at
  before update on tokens
  for each row execute function update_updated_at();

-- ── DONE ─────────────────────────────────────────────────────
-- Copy this entire file and run it in:
-- https://wwlomifjbgblcvjhggdb.supabase.co/project/wwlomifjbgblcvjhggdb/sql/new
