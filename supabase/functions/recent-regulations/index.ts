import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  if (req.method !== 'GET') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const url = new URL(req.url)
    const searchParams = url.searchParams
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')
    const search = searchParams.get('search') || ''

    // Build query for all regulations sorted by newest upload
    let query = supabase
      .from('regulations')
      .select(`
        id,
        jenis_peraturan,
        instansi,
        judul_lengkap,
        nomor,
        tahun,
        tentang,
        tanggal_penetapan,
        tanggal_pengundangan,
        status,
        upload_date,
        sector_impacts,
        user_workspaces!left (id)
      `)
      .order('upload_date', { ascending: false })
      .range(offset, offset + limit - 1)

    // Add search filter if provided
    if (search) {
      query = query.or(`judul_lengkap.ilike.%${search}%,nomor.ilike.%${search}%,tentang.ilike.%${search}%`)
    }

    const { data: regulations, error } = await query

    if (error) {
      throw new Error(`Failed to fetch recent regulations: ${error.message}`)
    }

    // Transform data to include workspace status
    const transformedRegulations = regulations?.map(reg => ({
      ...reg,
      in_workspace: !!reg.user_workspaces?.length
    })) || []

    // Get total count for pagination
    let countQuery = supabase
      .from('regulations')
      .select('*', { count: 'exact', head: true })

    if (search) {
      countQuery = countQuery.or(`judul_lengkap.ilike.%${search}%,nomor.ilike.%${search}%,tentang.ilike.%${search}%`)
    }

    const { count, error: countError } = await countQuery

    if (countError) {
      console.warn('Failed to get count:', countError)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: transformedRegulations,
        pagination: {
          total: count || 0,
          limit,
          offset,
          has_more: (count || 0) > offset + limit,
          current_page: Math.floor(offset / limit) + 1,
          total_pages: Math.ceil((count || 0) / limit)
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Recent regulations error:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})