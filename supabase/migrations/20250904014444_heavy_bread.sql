/*
  # Add separate AI and user checklist columns

  1. New Columns
    - `ai_checklist` (jsonb) - Stores AI-generated checklist items with default empty array
    - `user_checklist` (jsonb) - Stores user-created checklist items with default empty array

  2. Indexes
    - GIN index on `ai_checklist` for efficient JSON queries
    - GIN index on `user_checklist` for efficient JSON queries

  3. Purpose
    - Separates AI-generated suggestions from user-created tasks
    - Prevents data redundancy and synchronization issues
    - Enables clear UI differentiation between AI and user content
*/

-- Add ai_checklist column to regulations table
ALTER TABLE public.regulations
ADD COLUMN IF NOT EXISTS ai_checklist jsonb DEFAULT '[]'::jsonb;

-- Add user_checklist column to regulations table  
ALTER TABLE public.regulations
ADD COLUMN IF NOT EXISTS user_checklist jsonb DEFAULT '[]'::jsonb;

-- Create GIN index for ai_checklist for efficient JSON queries
CREATE INDEX IF NOT EXISTS idx_regulations_ai_checklist ON public.regulations USING gin (ai_checklist);

-- Create GIN index for user_checklist for efficient JSON queries
CREATE INDEX IF NOT EXISTS idx_regulations_user_checklist ON public.regulations USING gin (user_checklist);