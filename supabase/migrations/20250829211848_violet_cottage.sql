/*
  # Add meta_data column to regulations table

  1. Schema Changes
    - Add `meta_data` column to `regulations` table
    - Column type: jsonb (for storing extracted metadata as JSON)
    - Allow null values for existing records

  2. Purpose
    - Store complete extracted metadata from AI analysis
    - Include extraction timestamp and source information
    - Support future metadata enhancements
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'regulations' AND column_name = 'meta_data'
  ) THEN
    ALTER TABLE regulations ADD COLUMN meta_data jsonb;
  END IF;
END $$;