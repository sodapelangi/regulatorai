import { createClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'npm:zod@3.22.4';
var ProcessingStatus;
// Utility Types and Enums
(function(ProcessingStatus) {
  ProcessingStatus["PENDING"] = "pending";
  ProcessingStatus["PROCESSING"] = "processing";
  ProcessingStatus["COMPLETED"] = "completed";
  ProcessingStatus["FAILED"] = "failed";
})(ProcessingStatus || (ProcessingStatus = {}));
var EmbeddingProvider;
(function(EmbeddingProvider) {
  EmbeddingProvider["SUPABASE_AI"] = "supabase_ai";
  EmbeddingProvider["GEMINI"] = "gemini";
})(EmbeddingProvider || (EmbeddingProvider = {}));
// Input Validation Schema
const DocumentProcessingSchema = z.object({
  document_id: z.string().uuid(),
  document_type: z.string(),
  source_url: z.string().url().optional(),
  processing_priority: z.number().min(1).max(10).default(5)
});
// Chunk Validation Schema
const DocumentChunkSchema = z.object({
  id: z.string().uuid(),
  content: z.string().min(1),
  title: z.string().optional(),
  level: z.number().min(0).optional(),
  section_number: z.string().optional(),
  chunk_type: z.string().optional(),
  parent_section: z.string().uuid().optional()
});
// Configuration and Environment Setup
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
// Utility Functions
async function downloadDocument(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download document: ${response.statusText}`);
    }
    return await response.text();
  } catch (error) {
    console.error('Document download error:', error);
    throw error;
  }
}
async function generateEmbedding(text, provider = EmbeddingProvider.SUPABASE_AI) {
  if (!text || text.trim() === '') return null;
  try {
    switch(provider){
      case EmbeddingProvider.SUPABASE_AI:
        if (typeof Supabase === 'undefined') {
          console.warn('Supabase AI not available');
          return null;
        }
        const model = new Supabase.ai.Session('gte-small');
        return await model.run(text, {
          mean_pool: true,
          normalize: true
        });
      case EmbeddingProvider.GEMINI:
        if (!GEMINI_API_KEY) {
          console.warn('No Gemini API key provided');
          return null;
        }
        const embeddingResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${GEMINI_API_KEY}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'models/text-embedding-004',
            content: {
              parts: [
                {
                  text
                }
              ]
            }
          })
        });
        if (!embeddingResponse.ok) {
          const errorText = await embeddingResponse.text();
          console.warn(`Gemini embedding generation failed: ${errorText}`);
          return null;
        }
        const embeddingResult = await embeddingResponse.json();
        return embeddingResult.embedding.values;
      default:
        console.warn(`Unsupported embedding provider: ${provider}`);
        return null;
    }
  } catch (error) {
    console.error(`Embedding generation error: ${error}`);
    return null;
  }
}
function chunkDocument(documentText, maxChunkSize = 1000) {
  const chunks = [];
  const paragraphs = documentText.split('\n\n');
  let currentChunk = '';
  let chunkNumber = 1;
  paragraphs.forEach((paragraph)=>{
    if ((currentChunk + paragraph).length > maxChunkSize) {
      chunks.push({
        id: crypto.randomUUID(),
        content: currentChunk.trim(),
        title: `Chunk ${chunkNumber}`,
        level: 0,
        chunk_type: 'text',
        section_number: `chunk_${chunkNumber}`
      });
      currentChunk = paragraph;
      chunkNumber++;
    } else {
      currentChunk += '\n\n' + paragraph;
    }
  });
  // Add the last chunk
  if (currentChunk.trim()) {
    chunks.push({
      id: crypto.randomUUID(),
      content: currentChunk.trim(),
      title: `Chunk ${chunkNumber}`,
      level: 0,
      chunk_type: 'text',
      section_number: `chunk_${chunkNumber}`
    });
  }
  return chunks;
}
async function processDocument(documentId, documentType, sourceUrl) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  try {
    // 1. Update document status to processing
    const { data: documentData, error: documentFetchError } = await supabase.from('documents').update({
      status: ProcessingStatus.PROCESSING,
      processed_at: new Date().toISOString()
    }).eq('id', documentId).select('*').single();
    if (documentFetchError) throw documentFetchError;
    // 2. Download or retrieve document content
    const documentText = sourceUrl ? await downloadDocument(sourceUrl) : documentData.content;
    // 3. Chunk the document
    const chunks = chunkDocument(documentText);
    // 4. Process and insert chunks with embeddings
    const processedChunks = [];
    const embeddingProvider = GEMINI_API_KEY ? EmbeddingProvider.GEMINI : EmbeddingProvider.SUPABASE_AI;
    for (const chunk of chunks){
      let embedding = null;
      // Generate embedding
      if (chunk.content) {
        embedding = await generateEmbedding(chunk.content, embeddingProvider);
      }
      const processedChunk = {
        id: chunk.id,
        document_id: documentId,
        content: chunk.content,
        title: chunk.title,
        level: chunk.level || 0,
        chunk_type: chunk.chunk_type || 'text',
        embedding: embedding,
        metadata: {
          source_type: documentType,
          source_url: sourceUrl
        }
      };
      processedChunks.push(processedChunk);
    }
    // 5. Bulk insert chunks
    const { error: chunkInsertError } = await supabase.from('document_chunks').upsert(processedChunks, {
      onConflict: 'id'
    });
    if (chunkInsertError) throw chunkInsertError;
    // 6. Update document status
    await supabase.from('documents').update({
      status: ProcessingStatus.COMPLETED,
      chunk_count: processedChunks.length
    }).eq('id', documentId);
  } catch (error) {
    console.error('Document processing error:', error);
    // Update document status to failed
    await supabase.from('documents').update({
      status: ProcessingStatus.FAILED,
      error_details: error.message
    }).eq('id', documentId);
    throw error;
  }
}
// Main Edge Function Handler
Deno.serve(async (req)=>{
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  try {
    // Parse and validate input
    const payload = await req.json();
    const validatedPayload = DocumentProcessingSchema.parse(payload);
    // Check if document is already being processed
    const { data: existingJob, error: jobCheckError } = await supabase.from('documents').select('status').eq('id', validatedPayload.document_id).single();
    if (jobCheckError) throw jobCheckError;
    if (existingJob.status === ProcessingStatus.PROCESSING) {
      return new Response(JSON.stringify({
        message: 'Document is already being processed',
        document_id: validatedPayload.document_id
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    // Trigger document processing
    await processDocument(validatedPayload.document_id, validatedPayload.document_type, validatedPayload.source_url);
    return new Response(JSON.stringify({
      message: 'Document processing initiated',
      document_id: validatedPayload.document_id
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Processing error:', error);
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify({
        message: 'Validation Error',
        errors: error.errors
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    return new Response(JSON.stringify({
      message: 'Internal Server Error',
      error: error.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
});
