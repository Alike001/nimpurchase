CREATE TYPE purchase_status AS ENUM (
  'DRAFT', 'PAYMENT_PENDING', 'PAYMENT_SUBMITTED', 'PAYMENT_DETECTED',
  'ACTIVE', 'EXPIRED', 'PAYMENT_MISMATCH', 'PAYMENT_FAILED', 'CANCELLED'
);
CREATE TYPE support_status AS ENUM ('OPEN', 'IN_REVIEW', 'RESOLVED');

CREATE TABLE merchants (
  id uuid PRIMARY KEY,
  display_name text NOT NULL,
  wallet_address text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE reward_programs (
  id uuid PRIMARY KEY,
  merchant_id uuid NOT NULL REFERENCES merchants(id),
  type text NOT NULL CHECK (type = 'VISIT_COUNT'),
  threshold integer NOT NULL CHECK (threshold > 0),
  reward_description text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE purchases (
  id uuid PRIMARY KEY,
  chain_reference text NOT NULL UNIQUE,
  merchant_id uuid NOT NULL REFERENCES merchants(id),
  merchant_wallet_snapshot text NOT NULL,
  expected_amount_luna bigint NOT NULL CHECK (expected_amount_luna > 0),
  currency text NOT NULL CHECK (currency = 'NIM'),
  reward_rule_snapshot jsonb NOT NULL,
  warranty_note text,
  return_note text,
  status purchase_status NOT NULL,
  tx_hash text UNIQUE,
  buyer_wallet text,
  tx_block_height bigint,
  tx_timestamp timestamptz,
  payment_detected_at timestamptz,
  finalized_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

CREATE TABLE purchase_items (
  id uuid PRIMARY KEY,
  purchase_id uuid NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price_luna bigint NOT NULL CHECK (unit_price_luna > 0),
  line_total_luna bigint NOT NULL CHECK (line_total_luna > 0)
);

CREATE TABLE reward_events (
  id uuid PRIMARY KEY,
  merchant_id uuid NOT NULL REFERENCES merchants(id),
  buyer_wallet text NOT NULL,
  purchase_id uuid NOT NULL REFERENCES purchases(id),
  delta integer NOT NULL,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (purchase_id, reason)
);

CREATE TABLE support_requests (
  id uuid PRIMARY KEY,
  purchase_id uuid NOT NULL REFERENCES purchases(id),
  buyer_wallet text NOT NULL,
  status support_status NOT NULL DEFAULT 'OPEN',
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE verification_attempts (
  id uuid PRIMARY KEY,
  purchase_id uuid NOT NULL REFERENCES purchases(id),
  tx_hash text NOT NULL,
  outcome text NOT NULL,
  detail text,
  retryable boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX purchases_buyer_wallet_active_idx ON purchases (buyer_wallet, created_at DESC)
  WHERE status = 'ACTIVE';
CREATE INDEX verification_attempts_purchase_idx ON verification_attempts (purchase_id, created_at DESC);

CREATE TABLE merchant_auth_challenges (
  id uuid PRIMARY KEY,
  wallet_address text NOT NULL,
  display_name text NOT NULL,
  message text NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE merchant_sessions (
  id uuid PRIMARY KEY,
  merchant_id uuid NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX merchant_sessions_expiry_idx ON merchant_sessions (expires_at);
CREATE INDEX merchant_auth_challenges_expiry_idx ON merchant_auth_challenges (expires_at);

CREATE TABLE support_auth_challenges (
  id uuid PRIMARY KEY,
  purchase_id uuid NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  wallet_address text NOT NULL,
  message text NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX support_auth_challenges_expiry_idx ON support_auth_challenges (expires_at);
