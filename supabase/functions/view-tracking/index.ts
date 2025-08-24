import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const url = new URL(req.url)
    const pathParts = url.pathname.split('/').filter(Boolean)
    const method = req.method

    // POST /view-tracking - Record a regulation view
    if (method === 'POST' && pathParts.length === 0) {
      const body = await req.json()
      const { regulation_id, view_duration_seconds = 0, source = 'unknown' } = body

      if (!regulation_id) {
        throw new Error('regulation_id is required')
      }

      // Check if regulation exists
      const { data: regulation, error: regError } = await supabase
        .from('regulations')
        .select('id')
        .eq('id', regulation_id)
        .single()

      if (regError || !regulation) {
        throw new Error('Regulation not found')
      }

      // Record the view
      const { data: view, error } = await supabase
        .from('regulation_views')
        .insert({
          regulation_id,
          view_duration_seconds,
          source,
          viewed_at: new Date().toISOString(),
          view_date: new Date().toISOString().split('T')[0] // YYYY-MM-DD format
        })
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to record view: ${error.message}`)
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          data: view,
          message: 'View recorded successfully'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // GET /view-tracking/history - Get today's view history
    if (method === 'GET' && pathParts.length === 2 && pathParts[1] === 'history') {
      const searchParams = url.searchParams
      const limit = parseInt(searchParams.get('limit') || '50')
      const offset = parseInt(searchParams.get('offset') || '0')
      const search = searchParams.get('search') || ''

      let query = supabase
        .from('daily_view_history')
        .select('*')
        .order('viewed_at', { ascending: false })
        .range(offset, offset + limit - 1)

      // Add search filter if provided
      if (search) {
        query = query.or(`judul_lengkap.ilike.%${search}%,nomor.ilike.%${search}%,tentang.ilike.%${search}%`)
      }

      const { data: viewHistory, error } = await query

      if (error) {
        throw new Error(`Failed to fetch view history: ${error.message}`)
      }

      // Get total count for pagination
      let countQuery = supabase
        .from('daily_view_history')
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
          data: viewHistory || [],
          pagination: {
            total: count || 0,
            limit,
            offset,
            has_more: (count || 0) > offset + limit
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // GET /view-tracking/recent - Get recent regulations (last 30 days)
    if (method === 'GET' && pathParts.length === 2 && pathParts[1] === 'recent') {
      const searchParams = url.searchParams
      const limit = parseInt(searchParams.get('limit') || '20')
      const offset = parseInt(searchParams.get('offset') || '0')

      const { data: recentRegulations, error } = await supabase
        .from('recent_regulations')
        .select('*')
        .order('upload_date', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) {
        throw new Error(`Failed to fetch recent regulations: ${error.message}`)
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          data: recentRegulations || [],
          count: recentRegulations?.length || 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // GET /view-tracking/stats - Get view statistics
    if (method === 'GET' && pathParts.length === 2 && pathParts[1] === 'stats') {
      // Get today's view count
      const { data: todayViews, error: todayError } = await supabase
        .from('regulation_views')
        .select('id')
        .eq('view_date', new Date().toISOString().split('T')[0])

      if (todayError) {
        console.warn('Failed to get today views:', todayError)
      }

      // Get most viewed regulations today
      const { data: mostViewed, error: mostViewedError } = await supabase
        .from('regulation_views')
        .select(`
          regulation_id,
          regulations (
            judul_lengkap,
            nomor,
            tahun
          )
        `)
        .eq('view_date', new Date().toISOString().split('T')[0])

      if (mostViewedError) {
        console.warn('Failed to get most viewed:', mostViewedError)
      }

      // Count views per regulation
      const viewCounts = mostViewed?.reduce((acc, view) => {
        const regId = view.regulation_id
        acc[regId] = (acc[regId] || 0) + 1
        return acc
      }, {} as Record<string, number>) || {}

      // Get top 5 most viewed
      const topRegulations = Object.entries(viewCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([regId, count]) => {
          const regulation = mostViewed?.find(v => v.regulation_id === regId)?.regulations
          return {
            regulation_id: regId,
            view_count: count,
            regulation
          }
        })

      return new Response(
        JSON.stringify({ 
          success: true, 
          data: {
            today_views: todayViews?.length || 0,
            most_viewed_today: topRegulations
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('View tracking error:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})