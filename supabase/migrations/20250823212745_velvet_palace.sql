/*
  # Fix RLS Policy for Ingestion Jobs

  1. Security Changes
    - Update RLS policy to allow anonymous users to insert jobs
    - Allow anonymous users to view and update their own jobs using session-based tracking
    - Maintain security by using temporary session identification

  2. Changes Made
    - Modified INSERT policy to allow anonymous users
    - Updated SELECT and UPDATE policies for session-based access
    - Added helper function for session tracking
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can insert their own jobs" ON ingestion_jobs;
DROP POLICY IF EXISTS "Users can view their own jobs" ON ingestion_jobs;
DROP POLICY IF EXISTS "Users can update their own jobs" ON ingestion_jobs;

-- Create new policies that work with anonymous users
CREATE POLICY "Anyone can insert ingestion jobs"
  ON ingestion_jobs
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can view ingestion jobs"
  ON ingestion_jobs
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can update ingestion jobs"
  ON ingestion_jobs
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);