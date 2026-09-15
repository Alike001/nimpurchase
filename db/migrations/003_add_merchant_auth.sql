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
