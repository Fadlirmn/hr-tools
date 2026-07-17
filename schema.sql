-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Positions table
CREATE TABLE IF NOT EXISTS positions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'Posisi Baru',
  weights JSONB NOT NULL DEFAULT '{}'
);

-- Candidates table
CREATE TABLE IF NOT EXISTS candidates (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  nama TEXT NOT NULL,
  posisi TEXT REFERENCES positions(id) ON DELETE SET NULL,
  sumber TEXT DEFAULT 'LinkedIn',
  email TEXT DEFAULT '',
  telepon TEXT DEFAULT '',
  catatan TEXT DEFAULT '',
  stage TEXT DEFAULT 'screening',
  tanggal TEXT DEFAULT '',
  invite_token TEXT UNIQUE DEFAULT NULL,
  cv JSONB DEFAULT NULL,
  psikotes JSONB DEFAULT NULL,
  interview JSONB DEFAULT NULL,
  onboarding JSONB DEFAULT NULL
);

-- Insert default positions
INSERT INTO positions (id, name, weights) VALUES
  ('copywriter', 'Copywriter / Scriptwriter', '{"exp":3,"skill":3,"portfolio":3,"achiev":2,"edu":1,"stability":1,"fit":2,"salary":1,"cvquality":1,"soft":2}'),
  ('videoeditor', 'Video Editor', '{"exp":3,"skill":3,"portfolio":3,"achiev":1,"edu":1,"stability":1,"fit":2,"salary":1,"cvquality":1,"soft":1}'),
  ('creator', 'Content Creator / Talent', '{"exp":2,"skill":2,"portfolio":3,"achiev":2,"edu":1,"stability":1,"fit":3,"salary":1,"cvquality":1,"soft":3}'),
  ('sosmed', 'Social Media Admin', '{"exp":2,"skill":3,"portfolio":2,"achiev":2,"edu":1,"stability":2,"fit":2,"salary":1,"cvquality":2,"soft":2}'),
  ('designer', 'Graphic Designer', '{"exp":3,"skill":3,"portfolio":3,"achiev":1,"edu":1,"stability":1,"fit":2,"salary":1,"cvquality":1,"soft":1}'),
  ('admin', 'Admin Marketplace / Olshop', '{"exp":2,"skill":2,"portfolio":1,"achiev":1,"edu":1,"stability":3,"fit":2,"salary":1,"cvquality":3,"soft":2}')
ON CONFLICT (id) DO NOTHING;

-- Enable Row Level Security
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;

-- RLS: HR can do everything
CREATE POLICY "hr_all_positions" ON positions FOR ALL USING (true);
CREATE POLICY "hr_all_candidates" ON candidates FOR ALL USING (true);

-- RLS: Candidates can only read their own data
CREATE POLICY "candidate_read_own" ON candidates FOR SELECT
  USING (user_id = auth.uid());
