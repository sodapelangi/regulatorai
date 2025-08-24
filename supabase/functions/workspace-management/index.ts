import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

interface WorkspaceItem {
  id?: string
  regulation_id: string
  priority: 'low' | 'medium' | 'high'
  status: 'pending' | 'in-progress' | 'completed'
  notes: string
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

    // GET /workspace - Get all workspace items
    if (method === 'GET' && pathParts.length === 0) {
      const { data: workspaceItems, error } = await supabase
        .from('user_workspaces')
        .select(`
          *,
          regulations (
            id,
            judul_lengkap,
            nomor,
            tahun,
            tentang,
            upload_date,
            tanggal_penetapan,
            instansi,
            status,
            ai_analysis,
            sector_impacts
          )
        `)
        .order('added_at', { ascending: false })

      if (error) {
        throw new Error(`Failed to fetch workspace: ${error.message}`)
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          data: workspaceItems || [],
          count: workspaceItems?.length || 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // POST /workspace - Add regulation to workspace
    if (method === 'POST' && pathParts.length === 0) {
      const body = await req.json()
      const { regulation_id, priority = 'medium', status = 'pending', notes = '' } = body

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

      // Check if already in workspace
      const { data: existing } = await supabase
        .from('user_workspaces')
        .select('id')
        .eq('regulation_id', regulation_id)
        .single()

      if (existing) {
        throw new Error('Regulation already in workspace')
      }

      // Add to workspace
      const { data: workspaceItem, error } = await supabase
        .from('user_workspaces')
        .insert({
          regulation_id,
          priority,
          status,
          notes
        })
        .select(`
          *,
          regulations (
            id,
            judul_lengkap,
            nomor,
            tahun,
            tentang,
            upload_date
          )
        `)
        .single()

      if (error) {
        throw new Error(`Failed to add to workspace: ${error.message}`)
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          data: workspaceItem,
          message: 'Added to workspace successfully'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // PUT /workspace/:id - Update workspace item
    if (method === 'PUT' && pathParts.length === 1) {
      const workspaceId = pathParts[0]
      const body = await req.json()
      const { priority, status, notes } = body

      const updates: Partial<WorkspaceItem> = {}
      if (priority) updates.priority = priority
      if (status) updates.status = status
      if (notes !== undefined) updates.notes = notes

      if (Object.keys(updates).length === 0) {
        throw new Error('No valid fields to update')
      }

      const { data: workspaceItem, error } = await supabase
        .from('user_workspaces')
        .update(updates)
        .eq('id', workspaceId)
        .select(`
          *,
          regulations (
            id,
            judul_lengkap,
            nomor,
            tahun,
            tentang,
            upload_date
          )
        `)
        .single()

      if (error) {
        throw new Error(`Failed to update workspace item: ${error.message}`)
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          data: workspaceItem,
          message: 'Workspace item updated successfully'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // DELETE /workspace/:id - Remove from workspace
    if (method === 'DELETE' && pathParts.length === 1) {
      const workspaceId = pathParts[0]

      const { error } = await supabase
        .from('user_workspaces')
        .delete()
        .eq('id', workspaceId)

      if (error) {
        throw new Error(`Failed to remove from workspace: ${error.message}`)
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Removed from workspace successfully'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // GET /workspace/stats - Get workspace statistics
    if (method === 'GET' && pathParts.length === 1 && pathParts[0] === 'stats') {
      const { data: stats, error } = await supabase
        .from('user_workspaces')
        .select('status, priority')

      if (error) {
        throw new Error(`Failed to fetch workspace stats: ${error.message}`)
      }

      const statusCounts = stats?.reduce((acc, item) => {
        acc[item.status] = (acc[item.status] || 0) + 1
        return acc
      }, {} as Record<string, number>) || {}

      const priorityCounts = stats?.reduce((acc, item) => {
        acc[item.priority] = (acc[item.priority] || 0) + 1
        return acc
      }, {} as Record<string, number>) || {}

      return new Response(
        JSON.stringify({ 
          success: true, 
          data: {
            total: stats?.length || 0,
            by_status: statusCounts,
            by_priority: priorityCounts,
            completion_rate: stats?.length ? 
              Math.round(((statusCounts.completed || 0) / stats.length) * 100) : 0
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
    console.error('Workspace management error:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})