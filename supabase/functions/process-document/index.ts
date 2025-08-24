import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ChunkerResponse {
  status: string
  processing_time?: number
  metadata: {
    judul?: string
    nomor?: string
    tahun?: string
    tentang?: string
    menimbang?: Array<{point: string, text: string}>
    mengingat?: Array<{point: string, text: string}>
    document_type?: string
    tempat_penetapan?: string
    tanggal_penetapan?: string
    jabatan_penandatangan?: string
    nama_penandatangan?: string
  }
  chunks: Array<{
    level: number
    title: string
    content: string
    chunk_type: string
    section_number?: string
    parent_section?: string
    content_length: number
  }>
  summary: {
    total_chunks: number
    level_counts: Record<string, number>
    total_characters: number
  }
}

interface GeminiEmbeddingResponse {
  embedding: {
    values: number[]
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
  return new Response(null, { 
    status: 200,
    headers: corsHeaders 
  })
}

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { jobId, documentText, filename } = await req.json()

    if (!jobId || !documentText) {
      throw new Error('Missing required parameters: jobId and documentText')
    }

    console.log(`Processing document for job ${jobId}`)

    // Update job status to processing
    await supabase
      .from('ingestion_jobs')
      .update({
        status: 'processing',
        progress: JSON.stringify({
          stage: 'processing',
          progress: 5,
          message: 'Starting document processing'
        }),
        started_at: new Date().toISOString()
      })
      .eq('id', jobId)

    // Call chunker service
    const chunkerUrl = Deno.env.get('CHUNKER_SERVICE_URL') || 'http://host.docker.internal:8000'
    
    console.log(`Calling chunker service at ${chunkerUrl}`)
    
    const chunkerResponse = await fetch(`${chunkerUrl}/chunk-document`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: documentText,
        options: {
          max_chunk_size: 1500,
          overlap_size: 100
        }
      })
    })

    if (!chunkerResponse.ok) {
      throw new Error(`Chunker service error: ${chunkerResponse.status}`)
    }

    const chunkerResult = await chunkerResponse.json()
    
    // If chunker returns job ID, poll for results
    if (chunkerResult.status === 'processing') {
      const chunkerJobId = chunkerResult.job_id
      let finalResult: ChunkerResponse | null = null
      
      // Poll chunker for progress and results
      while (!finalResult) {
        await new Promise(resolve => setTimeout(resolve, 2000)) // Wait 2 seconds
        
        const progressResponse = await fetch(`${chunkerUrl}/job/${chunkerJobId}/progress`)
        if (progressResponse.ok) {
          const progress = await progressResponse.json()
          
          // Update our job progress based on chunker progress
          await supabase
            .from('ingestion_jobs')
            .update({
              progress: JSON.stringify({
                stage: progress.stage,
                progress: Math.min(progress.progress * 0.7, 70),
                message: progress.message,
                current_chunk: progress.current_chunk,
                total_chunks: progress.total_chunks
              })
            })
            .eq('id', jobId)
          
          if (progress.stage === 'completed') {
            const resultResponse = await fetch(`${chunkerUrl}/job/${chunkerJobId}/result`)
            if (resultResponse.ok) {
              finalResult = await resultResponse.json()
            }
          } else if (progress.stage === 'failed') {
            throw new Error(`Chunker processing failed: ${progress.message}`)
          }
        }
      }
      
      if (!finalResult) {
        throw new Error('Failed to get chunker results')
      }
      
      chunkerResult.metadata = finalResult.metadata
      chunkerResult.chunks = finalResult.chunks
      chunkerResult.summary = finalResult.summary
    }

    await supabase
      .from('ingestion_jobs')
      .update({
        progress: JSON.stringify({
          stage: 'storing',
          progress: 75,
          message: 'Storing regulation metadata'
        })
      })
      .eq('id', jobId)

    // Parse dates
    const parseIndonesianDate = (dateStr: string): string | null => {
      if (!dateStr) return null
      
      // Handle various Indonesian date formats
      const months: Record<string, string> = {
        'januari': '01', 'februari': '02', 'maret': '03', 'april': '04',
        'mei': '05', 'juni': '06', 'juli': '07', 'agustus': '08',
        'september': '09', 'oktober': '10', 'november': '11', 'desember': '12'
      }
      
      // Try to parse "DD Month YYYY" format
      const match = dateStr.toLowerCase().match(/(\d{1,2})\s+(\w+)\s+(\d{4})/)
      if (match) {
        const [, day, month, year] = match
        const monthNum = months[month]
        if (monthNum) {
          return `${year}-${monthNum}-${day.padStart(2, '0')}`
        }
      }
      
      return null
    }

    // Insert regulation record
    const { data: regulation, error: regError } = await supabase
      .from('regulations')
      .insert({
        jenis_peraturan: chunkerResult.metadata.document_type || 'PERATURAN',
        instansi: chunkerResult.metadata.jabatan_penandatangan || 'PEMERINTAH',
        judul_lengkap: chunkerResult.metadata.judul || filename,
        nomor: chunkerResult.metadata.nomor,
        tahun: chunkerResult.metadata.tahun ? parseInt(chunkerResult.metadata.tahun) : new Date().getFullYear(),
        tentang: chunkerResult.metadata.tentang,
        menimbang: JSON.stringify(chunkerResult.metadata.menimbang || []),
        mengingat: JSON.stringify(chunkerResult.metadata.mengingat || []),
        document_type: chunkerResult.metadata.document_type || 'Peraturan',
        tanggal_penetapan: parseIndonesianDate(chunkerResult.metadata.tanggal_penetapan || ''),
        tanggal_pengundangan: parseIndonesianDate(chunkerResult.metadata.tanggal_penetapan || ''), // Fallback
        full_text: documentText,
        status: 'active'
      })
      .select()
      .single()

    if (regError) {
      console.error('Error inserting regulation:', regError)
      throw new Error(`Database error: ${regError.message}`)
    }

    console.log(`Created regulation record: ${regulation.id}`)

    await supabase
      .from('ingestion_jobs')
      .update({
        progress: JSON.stringify({
          stage: 'embedding',
          progress: 80,
          message: 'Generating embeddings for chunks'
        })
      })
      .eq('id', jobId)

    // Generate embeddings and store chunks
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
    if (!geminiApiKey) {
      console.warn('No Gemini API key found, storing chunks without embeddings')
    }

    const chunksToInsert = []
    let parentChunkMap: Record<string, string> = {} // Map from chunker parent_section to DB chunk ID

    // Process chunks in order to maintain hierarchy
    for (let i = 0; i < chunkerResult.chunks.length; i++) {
      const chunk = chunkerResult.chunks[i]
      
      // Update progress
      const chunkProgress = 80 + (15 * (i + 1) / chunkerResult.chunks.length)
      await supabase
        .from('ingestion_jobs')
        .update({
          progress: JSON.stringify({
            stage: 'embedding',
            progress: chunkProgress,
            message: `Processing chunk ${i + 1}/${chunkerResult.chunks.length}: ${chunk.title}`,
            current_chunk: i + 1,
            total_chunks: chunkerResult.chunks.length
          })
        })
        .eq('id', jobId)

      let embedding: number[] | null = null

      // Generate embedding if API key is available
      if (geminiApiKey && chunk.content.trim()) {
        try {
          const embeddingResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${geminiApiKey}`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                model: 'models/text-embedding-004',
                content: {
                  parts: [{ text: chunk.content }]
                }
              })
            }
          )

          if (embeddingResponse.ok) {
            const embeddingResult: GeminiEmbeddingResponse = await embeddingResponse.json()
            embedding = embeddingResult.embedding.values
          } else {
            console.warn(`Failed to generate embedding for chunk ${i + 1}:`, await embeddingResponse.text())
          }
        } catch (error) {
          console.warn(`Error generating embedding for chunk ${i + 1}:`, error)
        }
      }

      // Determine parent chunk ID
      let parentChunkId: string | null = null
      if (chunk.parent_section && parentChunkMap[chunk.parent_section]) {
        parentChunkId = parentChunkMap[chunk.parent_section]
      }

      const chunkId = crypto.randomUUID()
      
      chunksToInsert.push({
        id: chunkId,
        regulation_id: regulation.id,
        chunk_level: chunk.level,
        chunk_type: chunk.chunk_type,
        content: chunk.content,
        title: chunk.title,
        parent_section: parentChunkId,
        embedding: embedding,
        word_count: chunk.content.split(/\s+/).length,
        character_count: chunk.content_length
      })

      // Update parent mapping for next chunks
      if (chunk.section_number || chunk.title) {
        const key = chunk.section_number || chunk.title
        parentChunkMap[key] = chunkId
      }
    }

    // Insert all chunks
    const { error: chunksError } = await supabase
      .from('document_chunks')
      .insert(chunksToInsert)

    if (chunksError) {
      console.error('Error inserting chunks:', chunksError)
      throw new Error(`Failed to store chunks: ${chunksError.message}`)
    }

    // Update job as completed
    await supabase
      .from('ingestion_jobs')
      .update({
        progress: JSON.stringify({
          stage: 'completed',
          progress: 100,
          message: `Successfully processed ${chunkerResult.chunks.length} chunks`
        })
      })
      .eq('id', jobId)

    await supabase
      .from('ingestion_jobs')
      .update({
        status: 'completed',
        regulation_id: regulation.id,
        completed_at: new Date().toISOString()
      })
      .eq('id', jobId)

    console.log(`Successfully processed document for job ${jobId}`)

    return new Response(
      JSON.stringify({
        success: true,
        regulation_id: regulation.id,
        chunks_created: chunkerResult.chunks.length,
        processing_time: chunkerResult.processing_time
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Error processing document:', error)

    // Update job as failed if we have jobId
    try {
      const body = await req.clone().json()
      const jobId = body.jobId
      
      if (jobId) {
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        await supabase
          .from('ingestion_jobs')
          .update({
            status: 'failed',
            error_message: error.message,
            completed_at: new Date().toISOString()
          })
          .eq('id', jobId)
      }
    } catch (updateError) {
      console.error('Error updating failed job:', updateError)
    }

    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})