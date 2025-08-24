/*
  # Add AI Analysis Columns to Regulations Table

  1. New Columns
    - `ai_analysis` (jsonb) - Stores structured AI analysis results
    - `sector_impacts` (jsonb) - Stores sector impact classifications
    - `analysis_confidence` (numeric) - Overall analysis confidence score
    - `last_analyzed_at` (timestamp) - When analysis was last performed

  2. Indexes
    - Add GIN index on ai_analysis for efficient JSON queries
    - Add index on last_analyzed_at for analysis scheduling
*/

-- Add AI analysis columns
ALTER TABLE regulations 
ADD COLUMN IF NOT EXISTS ai_analysis JSONB,
ADD COLUMN IF NOT EXISTS sector_impacts JSONB,
ADD COLUMN IF NOT EXISTS analysis_confidence NUMERIC(3,2),
ADD COLUMN IF NOT EXISTS last_analyzed_at TIMESTAMPTZ;

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_regulations_ai_analysis 
ON regulations USING GIN (ai_analysis);

CREATE INDEX IF NOT EXISTS idx_regulations_sector_impacts 
ON regulations USING GIN (sector_impacts);

CREATE INDEX IF NOT EXISTS idx_regulations_last_analyzed 
ON regulations (last_analyzed_at);

-- Add comment for documentation
COMMENT ON COLUMN regulations.ai_analysis IS 'Structured AI analysis including background, key points, comparisons, and business impact';
COMMENT ON COLUMN regulations.sector_impacts IS 'Array of sector impact classifications with confidence scores';
COMMENT ON COLUMN regulations.analysis_confidence IS 'Overall AI analysis confidence score (0.00-1.00)';
COMMENT ON COLUMN regulations.last_analyzed_at IS 'Timestamp of last AI analysis performed';