/*
  # Create Regulations Database Schema

  1. New Tables
    - `regulations` - Main regulation documents with Indonesian legal metadata
    - `document_chunks` - Hierarchical chunks with vector embeddings
    - `ingestion_jobs` - Track document processing jobs

  2. Security
    - Enable RLS on all tables
    - Public read access for regulations
    - User-scoped access for jobs

  3. Extensions
    - Enable pgvector for embeddings
    - Enable uuid generation
*/

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- Create regulations table with Indonesian legal document structure
CREATE TABLE IF NOT EXISTS regulations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  jenis_peraturan text,
  instansi text,
  judul_lengkap text NOT NULL,
  nomor text,
  tahun integer,
  tentang text,
  menimbang jsonb, -- Array of {point, text} objects
  mengingat jsonb, -- Array of {point, text} objects
  document_type text,
  tanggal_penetapan date,
  tanggal_pengundangan date,
  status text CHECK (status IN ('active', 'draft', 'proposed', 'revoked')) DEFAULT 'active',
  upload_date timestamptz DEFAULT now(),
  full_text text,
  
  -- Additional metadata
  tempat_penetapan text,
  jabatan_penandatangan text,
  nama_penandatangan text,
  
  -- Search optimization
  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('indonesian', 
      coalesce(judul_lengkap, '') || ' ' || 
      coalesce(tentang, '') || ' ' || 
      coalesce(nomor, '')
    )
  ) STORED
);

-- Create document chunks table with hierarchical structure
CREATE TABLE IF NOT EXISTS document_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  regulation_id uuid REFERENCES regulations(id) ON DELETE CASCADE,
  chunk_level integer NOT NULL CHECK (chunk_level IN (1, 2, 3)),
  chunk_type text CHECK (chunk_type IN ('metadata', 'bab', 'pasal', 'major_section')),
  content text NOT NULL,
  title text,
  section_number text,
  parent_section uuid REFERENCES document_chunks(id) ON DELETE SET NULL,
  embedding vector(768), -- Gemini embedding dimension
  word_count integer,
  character_count integer,
  created_at timestamptz DEFAULT now(),
  
  -- Ensure proper hierarchy
  CONSTRAINT valid_hierarchy CHECK (
    (chunk_level = 1 AND parent_section IS NULL) OR
    (chunk_level > 1 AND parent_section IS NOT NULL)
  )
);

-- Create ingestion jobs table for tracking processing
CREATE TABLE IF NOT EXISTS ingestion_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filename text NOT NULL,
  file_size bigint,
  status text CHECK (status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',
  progress jsonb DEFAULT '{"stage": "pending", "progress": 0, "message": "Job queued"}',
  regulation_id uuid REFERENCES regulations(id) ON DELETE SET NULL,
  error_message text,
  processing_time_seconds integer,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_regulations_search ON regulations USING gin(search_vector);
CREATE INDEX IF NOT EXISTS idx_regulations_status ON regulations(status);
CREATE INDEX IF NOT EXISTS idx_regulations_tahun ON regulations(tahun);
CREATE INDEX IF NOT EXISTS idx_regulations_jenis ON regulations(jenis_peraturan);

CREATE INDEX IF NOT EXISTS idx_chunks_regulation ON document_chunks(regulation_id);
CREATE INDEX IF NOT EXISTS idx_chunks_level ON document_chunks(chunk_level);
CREATE INDEX IF NOT EXISTS idx_chunks_parent ON document_chunks(parent_section);
CREATE INDEX IF NOT EXISTS idx_chunks_embedding ON document_chunks USING ivfflat (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS idx_jobs_status ON ingestion_jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_created_by ON ingestion_jobs(created_by);

-- Enable Row Level Security
ALTER TABLE regulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingestion_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for regulations (public read)
CREATE POLICY "Regulations are viewable by everyone"
  ON regulations FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert regulations"
  ON regulations FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for document_chunks (public read)
CREATE POLICY "Document chunks are viewable by everyone"
  ON document_chunks FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert chunks"
  ON document_chunks FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for ingestion_jobs (user-scoped)
CREATE POLICY "Users can view their own jobs"
  ON ingestion_jobs FOR SELECT
  TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Users can insert their own jobs"
  ON ingestion_jobs FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own jobs"
  ON ingestion_jobs FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid());

-- Create function for vector similarity search
CREATE OR REPLACE FUNCTION search_regulations(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  chunk_id uuid,
  regulation_id uuid,
  content text,
  title text,
  similarity float
)
LANGUAGE sql
AS $$
  SELECT
    dc.id as chunk_id,
    dc.regulation_id,
    dc.content,
    dc.title,
    1 - (dc.embedding <=> query_embedding) as similarity
  FROM document_chunks dc
  WHERE dc.embedding IS NOT NULL
    AND 1 - (dc.embedding <=> query_embedding) > match_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Create function to update job progress
CREATE OR REPLACE FUNCTION update_job_progress(
  job_id uuid,
  new_stage text,
  new_progress float,
  new_message text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE ingestion_jobs
  SET 
    progress = jsonb_build_object(
      'stage', new_stage,
      'progress', new_progress,
      'message', COALESCE(new_message, 'Processing...'),
      'updated_at', now()
    ),
    started_at = CASE WHEN started_at IS NULL AND new_stage != 'pending' THEN now() ELSE started_at END
  WHERE id = job_id;
END;
$$;