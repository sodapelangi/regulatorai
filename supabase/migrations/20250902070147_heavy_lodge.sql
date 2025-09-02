/*
  # Add separate checklist columns for AI and user-generated items

  1. New Columns
    - `ai_checklist` (jsonb) - Stores AI-generated action items
    - `user_checklist` (jsonb) - Stores user-created action items

  2. Purpose
    - Separate AI-generated suggestions from user-created tasks
    - Preserve original AI output for comparison and re-analysis
    - Enable user-specific task management without data loss

  3. Data Structure
    Each checklist column will store an array of objects with:
    - id: unique identifier
    - task: task description
    - completed: boolean status
    - created_at: timestamp
    - article_reference: optional legal reference
*/

-- Add AI checklist column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'regulations' AND column_name = 'ai_checklist'
  ) THEN
    ALTER TABLE regulations ADD COLUMN ai_checklist jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Add user checklist column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'regulations' AND column_name = 'user_checklist'
  ) THEN
    ALTER TABLE regulations ADD COLUMN user_checklist jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_regulations_ai_checklist ON regulations USING gin (ai_checklist);
CREATE INDEX IF NOT EXISTS idx_regulations_user_checklist ON regulations USING gin (user_checklist);