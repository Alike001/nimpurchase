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
