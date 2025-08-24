/*
  # Create workspace and view tracking tables

  1. New Tables
    - `user_workspaces`
      - `id` (uuid, primary key)
      - `regulation_id` (uuid, foreign key)
      - `priority` (text, enum: low/medium/high)
      - `status` (text, enum: pending/in-progress/completed)
      - `notes` (text)
      - `added_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `regulation_views`
      - `id` (uuid, primary key)
      - `regulation_id` (uuid, foreign key)
      - `viewed_at` (timestamp)
      - `view_date` (date, for daily grouping)
      - `view_duration_seconds` (integer)
      - `source` (text, tracking source)

  2. Security
    - Enable RLS on both tables
    - Add policies for public access (no auth required)
    
  3. Indexes
    - Performance indexes for common queries
*/

-- Create user_workspaces table
CREATE TABLE IF NOT EXISTS user_workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  regulation_id uuid REFERENCES regulations(id) ON DELETE CASCADE,
  priority text CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
  status text CHECK (status IN ('pending', 'in-progress', 'completed')) DEFAULT 'pending',
  notes text DEFAULT '',
  added_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(regulation_id) -- One regulation can only be in workspace once
);

-- Create regulation_views table
CREATE TABLE IF NOT EXISTS regulation_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  regulation_id uuid REFERENCES regulations(id) ON DELETE CASCADE,
  viewed_at timestamptz DEFAULT now(),
  view_date date DEFAULT CURRENT_DATE,
  view_duration_seconds integer DEFAULT 0,
  source text DEFAULT 'unknown' -- 'dashboard', 'workspace', 'search', etc.
);

-- Enable RLS
ALTER TABLE user_workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE regulation_views ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (no authentication required)
CREATE POLICY "Public can manage workspace"
  ON user_workspaces
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public can manage views"
  ON regulation_views
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_workspace_regulation ON user_workspaces(regulation_id);
CREATE INDEX IF NOT EXISTS idx_workspace_status ON user_workspaces(status);
CREATE INDEX IF NOT EXISTS idx_workspace_priority ON user_workspaces(priority);
CREATE INDEX IF NOT EXISTS idx_workspace_added_at ON user_workspaces(added_at DESC);

CREATE INDEX IF NOT EXISTS idx_views_regulation ON regulation_views(regulation_id);
CREATE INDEX IF NOT EXISTS idx_views_date ON regulation_views(view_date DESC);
CREATE INDEX IF NOT EXISTS idx_views_viewed_at ON regulation_views(viewed_at DESC);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
CREATE TRIGGER update_workspace_updated_at 
    BEFORE UPDATE ON user_workspaces 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create view for recent regulations (last 30 days)
CREATE OR REPLACE VIEW recent_regulations AS
SELECT DISTINCT ON (r.id) 
  r.*,
  rv.viewed_at,
  uw.id IS NOT NULL as in_workspace,
  uw.priority as workspace_priority,
  uw.status as workspace_status
FROM regulations r
LEFT JOIN regulation_views rv ON r.id = rv.regulation_id AND rv.view_date = CURRENT_DATE
LEFT JOIN user_workspaces uw ON r.id = uw.regulation_id
WHERE r.upload_date >= NOW() - INTERVAL '30 days'
ORDER BY r.id, r.upload_date DESC;

-- Create view for daily view history (today only)
CREATE OR REPLACE VIEW daily_view_history AS
SELECT 
  rv.*,
  r.judul_lengkap,
  r.nomor,
  r.tahun,
  r.tentang,
  r.upload_date,
  uw.id IS NOT NULL as in_workspace
FROM regulation_views rv
JOIN regulations r ON rv.regulation_id = r.id
LEFT JOIN user_workspaces uw ON r.id = uw.regulation_id
WHERE rv.view_date = CURRENT_DATE
ORDER BY rv.viewed_at DESC;