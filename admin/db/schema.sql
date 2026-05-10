-- Luli Dias — CRM database schema for Cloudflare D1
-- Run with: wrangler d1 execute lulidias-db --file=admin/db/schema.sql

-- ─────────────────────────────────────────────────────────────────────────────
-- subscribers — every person who registered (free trial, paid, cancelled, etc.)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscribers (
  id                      INTEGER PRIMARY KEY AUTOINCREMENT,
  email                   TEXT UNIQUE NOT NULL,
  whatsapp                TEXT,                          -- E.164 format: +351XXXXXXXX
  name                    TEXT,
  status                  TEXT NOT NULL DEFAULT 'trial', -- 'trial' | 'active' | 'past_due' | 'cancelled'
  plan                    TEXT,                          -- 'annual' | 'founder_annual' | 'founder_lifetime'
  trial_ends_at           INTEGER,                       -- unix timestamp (NULL for founders, who skip trial)
  stripe_customer_id      TEXT,
  stripe_subscription_id  TEXT,                          -- NULL for lifetime founders
  source                  TEXT,                          -- 'founder' | 'organic' | 'social' | 'referral'
  language                TEXT DEFAULT 'en',             -- 'en' | 'pt' (for email locale)
  created_at              INTEGER NOT NULL,              -- unix
  updated_at              INTEGER NOT NULL               -- unix
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_subscribers_email          ON subscribers(email);
CREATE INDEX        IF NOT EXISTS idx_subscribers_status         ON subscribers(status);
CREATE INDEX        IF NOT EXISTS idx_subscribers_stripe_cust    ON subscribers(stripe_customer_id);
CREATE INDEX        IF NOT EXISTS idx_subscribers_trial_ends_at  ON subscribers(trial_ends_at);

-- ─────────────────────────────────────────────────────────────────────────────
-- events — the CRM "memory": every meaningful action from a subscriber
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS events (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  subscriber_id INTEGER,                                 -- NULL allowed for anonymous events (paywall_hit before signup)
  type          TEXT NOT NULL,                           -- see EVENT_TYPES below
  metadata      TEXT,                                    -- JSON-encoded extra data
  created_at    INTEGER NOT NULL,
  FOREIGN KEY (subscriber_id) REFERENCES subscribers(id)
);

CREATE INDEX IF NOT EXISTS idx_events_subscriber  ON events(subscriber_id);
CREATE INDEX IF NOT EXISTS idx_events_type        ON events(type);
CREATE INDEX IF NOT EXISTS idx_events_created_at  ON events(created_at);

-- Conventional event types (just for reference, not enforced):
--   signup           — created account
--   trial_started    — 7-day trial began (public funnel only)
--   trial_ending     — 2 days before trial ends (we sent reminder)
--   paid             — first payment succeeded
--   renewed          — subsequent payment
--   payment_failed   — Stripe charge declined
--   cancelled        — user cancelled subscription
--   reactivated      — cancelled user came back
--   login            — magic-link login completed
--   paywall_hit      — clicked on locked content (anonymous OK)
--   founder_redeem   — redeemed a founder code

-- ─────────────────────────────────────────────────────────────────────────────
-- founder_codes — pre-generated codes with caps; tier locks the price
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS founder_codes (
  code           TEXT PRIMARY KEY,                       -- e.g., 'LULIFAM-LT-001' or 'LULIFAM-AN-001'
  tier           TEXT NOT NULL,                          -- 'lifetime' | 'annual'
  used_at        INTEGER,                                -- NULL = unused
  used_by_email  TEXT,
  created_at     INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_founder_codes_tier ON founder_codes(tier);
CREATE INDEX IF NOT EXISTS idx_founder_codes_used ON founder_codes(used_at);

-- ─────────────────────────────────────────────────────────────────────────────
-- magic_links — short-lived auth tokens for email-based login
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS magic_links (
  token       TEXT PRIMARY KEY,                          -- random 32-byte hex
  email       TEXT NOT NULL,
  expires_at  INTEGER NOT NULL,                          -- unix; we expire after 15 minutes
  used_at     INTEGER,                                   -- NULL = unused; we burn after first use
  created_at  INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_magic_links_email      ON magic_links(email);
CREATE INDEX IF NOT EXISTS idx_magic_links_expires_at ON magic_links(expires_at);

-- ─────────────────────────────────────────────────────────────────────────────
-- sessions — server-side session store (we use opaque tokens in HttpOnly cookies)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sessions (
  token         TEXT PRIMARY KEY,                        -- random 32-byte hex
  subscriber_id INTEGER NOT NULL,
  expires_at    INTEGER NOT NULL,                        -- unix; 30 days
  created_at    INTEGER NOT NULL,
  FOREIGN KEY (subscriber_id) REFERENCES subscribers(id)
);

CREATE INDEX IF NOT EXISTS idx_sessions_subscriber  ON sessions(subscriber_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at  ON sessions(expires_at);
