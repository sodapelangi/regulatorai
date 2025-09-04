-- Add ai_checklist column to regulations table
ALTER TABLE public.regulations
ADD COLUMN ai_checklist jsonb DEFAULT '[]'::jsonb;

-- Add user_checklist column to regulations table
ALTER TABLE public.regulations
ADD COLUMN user_checklist jsonb DEFAULT '[]'::jsonb;

-- Create GIN index for ai_checklist
CREATE INDEX idx_regulations_ai_checklist ON public.regulations USING gin (ai_checklist);

-- Create GIN index for user_checklist
CREATE INDEX idx_regulations_user_checklist ON public.regulations USING gin (user_checklist);
