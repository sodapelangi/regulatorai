import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      regulations: {
        Row: {
          id: string;
          jenis_peraturan: string | null;
          instansi: string | null;
          judul_lengkap: string;
          nomor: string | null;
          tahun: number | null;
          tentang: string | null;
          menimbang: string | null;
          mengingat: string | null;
          document_type: string | null;
          tanggal_penetapan: string | null;
          tanggal_pengundangan: string | null;
          status: 'active' | 'draft' | 'proposed' | 'revoked';
          upload_date: string;
          full_text: string | null;
          tempat_penetapan: string | null;
          jabatan_penandatangan: string | null;
          nama_penandatangan: string | null;
          search_vector: unknown | null;
          ai_analysis: unknown | null;
          sector_impacts: unknown | null;
          analysis_confidence: number | null;
          last_analyzed_at: string | null;
          meta_data: unknown | null;
          ai_checklist: unknown | null;
          user_checklist: unknown | null;
        };
        Insert: {
          id?: string;
          jenis_peraturan?: string | null;
          instansi?: string | null;
          judul_lengkap: string;
          nomor?: string | null;
          tahun?: number | null;
          tentang?: string | null;
          menimbang?: string | null;
          mengingat?: string | null;
          document_type?: string | null;
          tanggal_penetapan?: string | null;
          tanggal_pengundangan?: string | null;
          status?: 'active' | 'draft' | 'proposed' | 'revoked';
          upload_date?: string;
          full_text?: string | null;
          tempat_penetapan?: string | null;
          jabatan_penandatangan?: string | null;
          nama_penandatangan?: string | null;
          search_vector?: unknown | null;
          ai_analysis?: unknown | null;
          sector_impacts?: unknown | null;
          analysis_confidence?: number | null;
          last_analyzed_at?: string | null;
          meta_data?: unknown | null;
          ai_checklist?: unknown | null;
          user_checklist?: unknown | null;
        };
        Update: {
          id?: string;
          jenis_peraturan?: string | null;
          instansi?: string | null;
          judul_lengkap?: string;
          nomor?: string | null;
          tahun?: number | null;
          tentang?: string | null;
          menimbang?: string | null;
          mengingat?: string | null;
          document_type?: string | null;
          tanggal_penetapan?: string | null;
          tanggal_pengundangan?: string | null;
          status?: 'active' | 'draft' | 'proposed' | 'revoked';
          upload_date?: string;
          full_text?: string | null;
          tempat_penetapan?: string | null;
          jabatan_penandatangan?: string | null;
          nama_penandatangan?: string | null;
          search_vector?: unknown | null;
          ai_analysis?: unknown | null;
          sector_impacts?: unknown | null;
          analysis_confidence?: number | null;
          last_analyzed_at?: string | null;
          meta_data?: unknown | null;
          ai_checklist?: unknown | null;
          user_checklist?: unknown | null;
        };
      };
      document_chunks: {
        Row: {
          id: string;
          regulation_id: string;
          chunk_level: number;
          chunk_type: 'metadata' | 'bab' | 'pasal' | 'major_section' | null;
          content: string;
          title: string | null;
          parent_section: string | null;
          embedding: number[] | null;
          word_count: number | null;
          character_count: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          regulation_id: string;
          chunk_level: number;
          chunk_type?: 'metadata' | 'bab' | 'pasal' | 'major_section' | null;
          content: string;
          title?: string | null;
          parent_section?: string | null;
          embedding?: number[] | null;
          word_count?: number | null;
          character_count?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          regulation_id?: string;
          chunk_level?: number;
          chunk_type?: 'metadata' | 'bab' | 'pasal' | 'major_section' | null;
          content?: string;
          title?: string | null;
          parent_section?: string | null;
          embedding?: number[] | null;
          word_count?: number | null;
          character_count?: number | null;
          created_at?: string;
        };
      };
      ingestion_jobs: {
        Row: {
          id: string;
          filename: string;
          file_size: number | null;
          status: 'pending' | 'processing' | 'completed' | 'failed';
          progress: string | null;
          regulation_id: string | null;
          error_message: string | null;
          processing_time_seconds: number | null;
          created_by: string | null;
          created_at: string;
          started_at: string | null;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          filename: string;
          file_size?: number | null;
          status?: 'pending' | 'processing' | 'completed' | 'failed';
          progress?: string | null;
          regulation_id?: string | null;
          error_message?: string | null;
          processing_time_seconds?: number | null;
          created_by?: string | null;
          created_at?: string;
          started_at?: string | null;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          filename?: string;
          file_size?: number | null;
          status?: 'pending' | 'processing' | 'completed' | 'failed';
          progress?: string | null;
          regulation_id?: string | null;
          error_message?: string | null;
          processing_time_seconds?: number | null;
          created_by?: string | null;
          created_at?: string;
          started_at?: string | null;
          completed_at?: string | null;
        };
      };
    };
  };
};