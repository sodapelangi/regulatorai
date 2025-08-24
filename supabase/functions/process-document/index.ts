import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
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
    console.log('Handling OPTIONS preflight request')
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    })
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    console.log(`Method ${req.method} not allowed`)
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }

  let jobId: string | null = null

  try {
    console.log('=== REQUEST DEBUG INFO ===')
    console.log('Method:', req.method)
    console.log('URL:', req.url)
    console.log('Headers:', Object.fromEntries(req.headers.entries()))
    
    // Check content type
    const contentType = req.headers.get('content-type')
    console.log('Content-Type:', contentType)
    
    // Check content length
    const contentLength = req.headers.get('content-length')
    console.log('Content-Length:', contentLength)
    
    if (!contentLength || contentLength === '0') {
      throw new Error('Request body is empty - no content-length header or content-length is 0')
    }

    // Read the raw body text
    let rawBody: string
    try {
      rawBody = await req.text()
      console.log('Raw body length:', rawBody.length)
      console.log('Raw body preview (first 500 chars):', rawBody.substring(0, 500))
      
      if (!rawBody || rawBody.trim() === '') {
        throw new Error('Request body is empty or contains only whitespace')
      }
    } catch (textError) {
      console.error('Error reading request text:', textError)
      throw new Error(`Failed to read request body: ${textError.message}`)
    }

    // Parse JSON with better error handling
    let requestData: any
    try {
      requestData = JSON.parse(rawBody)
      console.log('Successfully parsed JSON')
      console.log('Request data keys:', Object.keys(requestData))
    } catch (parseError) {
      console.error('JSON Parse Error Details:')
      console.error('Parse error message:', parseError.message)
      console.error('Raw body that failed to parse:', rawBody)
      console.error('Raw body as hex:', Array.from(rawBody).map(c => c.charCodeAt(0).toString(16)).join(' '))
      
      throw new Error(`Invalid JSON in request body: ${parseError.message}. Body length: ${rawBody.length}`)
    }

    // Extract and validate required fields
    const { jobId: extractedJobId, documentText, filename } = requestData
    jobId = extractedJobId // Store for error handling

    console.log('Extracted fields:')
    console.log('- jobId:', extractedJobId)
    console.log('- filename:', filename)
    console.log('- documentText length:', documentText?.length || 0)

    if (!extractedJobId) {
      throw new Error('Missing required parameter: jobId')
    }

    if (!documentText) {
      throw new Error('Missing required parameter: documentText')
    }

    if (typeof documentText !== 'string') {
      throw new Error(`documentText must be a string, received: ${typeof documentText}`)
    }

    if (documentText.trim() === '') {
      throw new Error('documentText cannot be empty')
    }

    console.log(`Processing document for job ${extractedJobId}`)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Update job status to processing
    const { error: updateError } = await supabase
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
    const chunkerUrl = Deno.env.get('CHUNKER_SERVICE_URL') || 'https://regulatoryai-331153911805.europe-west1.run.app'
    
    console.log(`Calling chunker service at ${chunkerUrl}`)
    
    // Prepare chunker request
    const chunkerRequestBody = {
      text: documentText,
      options: {
        max_chunk_size: 1500,
        overlap_size: 100
      }
    }
    
    console.log('Chunker request body:', {
      text_length: documentText.length,
      options: chunkerRequestBody.options
    })
    
    let chunkerResponse: Response
    try {
      chunkerResponse = await fetch(`${chunkerUrl}/chunk-document`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(chunkerRequestBody)
      })
      
      console.log('Chunker response status:', chunkerResponse.status)
      console.log('Chunker response headers:', Object.fromEntries(chunkerResponse.headers.entries()))
      
    } catch (fetchError) {
      console.error('Failed to reach chunker service:', fetchError)
      throw new Error(`Failed to connect to chunker service: ${fetchError.message}`)
    }

    if (!chunkerResponse.ok) {
      const errorText = await chunkerResponse.text()
      console.error('Chunker service error details:')
      console.error('Status:', chunkerResponse.status)
      console.error('Status text:', chunkerResponse.statusText)
      console.error('Error response:', errorText)
      throw new Error(`Chunker service error: ${chunkerResponse.status} ${chunkerResponse.statusText} - ${errorText}`)
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
            .eq('id', extractedJobId)
          
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
      .eq('id', extractedJobId)

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
      .eq('id', extractedJobId)

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
        .eq('id', extractedJobId)

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
      .eq('id', extractedJobId)

    await supabase
      .from('ingestion_jobs')
      .update({
        status: 'completed',
        regulation_id: regulation.id,
        completed_at: new Date().toISOString()
      })
      .eq('id', extractedJobId)

    console.log(`Successfully processed document for job ${extractedJobId}`)

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
    console.error('=== ERROR DETAILS ===')
    console.error('Error message:', error.message)
    console.error('Error stack:', error.stack)

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
        
        console.log(`Updated job ${jobId} status to failed`)
      }
    } catch (updateError) {
      console.error('Error updating failed job:', updateError)
    }

    return new Response(
      JSON.stringify({ 
        error: error.message,
        timestamp: new Date().toISOString(),
        jobId: jobId
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})