import { supabase } from './supabase';

// Workspace API - Direct Supabase calls
export const workspaceApi = {
  // Get all workspace items
  async getWorkspace() {
    const { data, error } = await supabase
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
      .order('added_at', { ascending: false });

    if (error) throw error;
    return { data: data || [], count: data?.length || 0 };
  },

  // Add regulation to workspace
  async addToWorkspace(regulationId: string, options: {
    priority?: 'low' | 'medium' | 'high';
    status?: 'pending' | 'in-progress' | 'completed';
    notes?: string;
  } = {}) {
    // Check if regulation exists
    const { data: regulation, error: regError } = await supabase
      .from('regulations')
      .select('id')
      .eq('id', regulationId)
      .single();

    if (regError || !regulation) {
      throw new Error('Regulation not found');
    }

    // Check if already in workspace
    const { data: existing } = await supabase
      .from('user_workspaces')
      .select('id')
      .eq('regulation_id', regulationId)
      .single();

    if (existing) {
      throw new Error('Regulation already in workspace');
    }

    // Add to workspace
    const { data, error } = await supabase
      .from('user_workspaces')
      .insert({
        regulation_id: regulationId,
        priority: options.priority || 'medium',
        status: options.status || 'pending',
        notes: options.notes || ''
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
      .single();

    if (error) throw error;
    return { data, message: 'Added to workspace successfully' };
  },

  // Update workspace item
  async updateWorkspaceItem(workspaceId: string, updates: {
    priority?: 'low' | 'medium' | 'high';
    status?: 'pending' | 'in-progress' | 'completed';
    notes?: string;
  }) {
    const { data, error } = await supabase
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
      .single();

    if (error) throw error;
    return { data, message: 'Workspace item updated successfully' };
  },

  // Remove from workspace
  async removeFromWorkspace(workspaceId: string) {
    const { error } = await supabase
      .from('user_workspaces')
      .delete()
      .eq('id', workspaceId);

    if (error) throw error;
    return { message: 'Removed from workspace successfully' };
  },

  // Get workspace statistics
  async getWorkspaceStats() {
    const { data: stats, error } = await supabase
      .from('user_workspaces')
      .select('status, priority');

    if (error) throw error;

    const statusCounts = stats?.reduce((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    const priorityCounts = stats?.reduce((acc, item) => {
      acc[item.priority] = (acc[item.priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    return {
      data: {
        total: stats?.length || 0,
        by_status: statusCounts,
        by_priority: priorityCounts,
        completion_rate: stats?.length ? 
          Math.round(((statusCounts.completed || 0) / stats.length) * 100) : 0
      }
    };
  }
};

// Recent Regulations API - Direct Supabase calls
export const recentRegulationsApi = {
  // Get recent regulations (all uploaded, sorted by newest)
  async getRecentRegulations(options: {
    limit?: number;
    offset?: number;
    search?: string;
  } = {}) {
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
      .order('upload_date', { ascending: false });

    // Add search filter if provided
    if (options.search) {
      query = query.or(`judul_lengkap.ilike.%${options.search}%,nomor.ilike.%${options.search}%,tentang.ilike.%${options.search}%`);
    }

    // Add pagination
    if (options.limit) {
      const offset = options.offset || 0;
      query = query.range(offset, offset + options.limit - 1);
    }

    const { data: regulations, error } = await query;

    if (error) throw error;

    // Transform data to include workspace status
    const transformedRegulations = regulations?.map(reg => ({
      ...reg,
      in_workspace: !!reg.user_workspaces?.length
    })) || [];

    // Get total count for pagination
    let countQuery = supabase
      .from('regulations')
      .select('*', { count: 'exact', head: true });

    if (options.search) {
      countQuery = countQuery.or(`judul_lengkap.ilike.%${options.search}%,nomor.ilike.%${options.search}%,tentang.ilike.%${options.search}%`);
    }

    const { count, error: countError } = await countQuery;

    if (countError) {
      console.warn('Failed to get count:', countError);
    }

    return {
      data: transformedRegulations,
      pagination: {
        total: count || 0,
        limit: options.limit || transformedRegulations.length,
        offset: options.offset || 0,
        has_more: (count || 0) > (options.offset || 0) + (options.limit || transformedRegulations.length),
        current_page: Math.floor((options.offset || 0) / (options.limit || 20)) + 1,
        total_pages: Math.ceil((count || 0) / (options.limit || 20))
      }
    };
  }
};

// View Tracking API - Direct Supabase calls
export const viewTrackingApi = {
  // Record a regulation view
  async recordView(regulationId: string, options: {
    viewDurationSeconds?: number;
    source?: string;
  } = {}) {
    // Check if regulation exists
    const { data: regulation, error: regError } = await supabase
      .from('regulations')
      .select('id')
      .eq('id', regulationId)
      .single();

    if (regError || !regulation) {
      throw new Error('Regulation not found');
    }

    // Record the view
    const { data, error } = await supabase
      .from('regulation_views')
      .insert({
        regulation_id: regulationId,
        view_duration_seconds: options.viewDurationSeconds || 0,
        source: options.source || 'unknown',
        viewed_at: new Date().toISOString(),
        view_date: new Date().toISOString().split('T')[0] // YYYY-MM-DD format
      })
      .select()
      .single();

    if (error) throw error;
    return { data, message: 'View recorded successfully' };
  },

  // Get today's view history
  async getViewHistory(options: {
    limit?: number;
    offset?: number;
    search?: string;
  } = {}) {
    let query = supabase
      .from('daily_view_history')
      .select('*')
      .order('viewed_at', { ascending: false });

    // Add search filter if provided
    if (options.search) {
      query = query.or(`judul_lengkap.ilike.%${options.search}%,nomor.ilike.%${options.search}%,tentang.ilike.%${options.search}%`);
    }

    // Add pagination
    if (options.limit) {
      const offset = options.offset || 0;
      query = query.range(offset, offset + options.limit - 1);
    }

    const { data: viewHistory, error } = await query;

    if (error) throw error;

    // Get total count for pagination
    let countQuery = supabase
      .from('daily_view_history')
      .select('*', { count: 'exact', head: true });

    if (options.search) {
      countQuery = countQuery.or(`judul_lengkap.ilike.%${options.search}%,nomor.ilike.%${options.search}%,tentang.ilike.%${options.search}%`);
    }

    const { count, error: countError } = await countQuery;

    if (countError) {
      console.warn('Failed to get count:', countError);
    }

    return {
      data: viewHistory || [],
      pagination: {
        total: count || 0,
        limit: options.limit || (viewHistory?.length || 0),
        offset: options.offset || 0,
        has_more: (count || 0) > (options.offset || 0) + (options.limit || (viewHistory?.length || 0))
      }
    };
  },

  // Get view statistics
  async getViewStats() {
    // Get today's view count
    const { data: todayViews, error: todayError } = await supabase
      .from('regulation_views')
      .select('id')
      .eq('view_date', new Date().toISOString().split('T')[0]);

    if (todayError) {
      console.warn('Failed to get today views:', todayError);
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
      .eq('view_date', new Date().toISOString().split('T')[0]);

    if (mostViewedError) {
      console.warn('Failed to get most viewed:', mostViewedError);
    }

    // Count views per regulation
    const viewCounts = mostViewed?.reduce((acc, view) => {
      const regId = view.regulation_id;
      acc[regId] = (acc[regId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    // Get top 5 most viewed
    const topRegulations = Object.entries(viewCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([regId, count]) => {
        const regulation = mostViewed?.find(v => v.regulation_id === regId)?.regulations;
        return {
          regulation_id: regId,
          view_count: count,
          regulation
        };
      });

    return {
      data: {
        today_views: todayViews?.length || 0,
        most_viewed_today: topRegulations
      }
    };
  }
};

// Regulation API helpers
export const regulationApi = {
  // Get regulation with workspace status
  async getRegulationWithContext(regulationId: string) {
    const { data: regulation, error: regError } = await supabase
      .from('regulations')
      .select(`
        *,
        user_workspaces!left (
          id,
          priority,
          status,
          notes,
          added_at
        )
      `)
      .eq('id', regulationId)
      .single();

    if (regError) throw regError;

    // Record view
    await viewTrackingApi.recordView(regulationId, {
      source: 'regulation_detail'
    });

    return {
      ...regulation,
      in_workspace: !!regulation.user_workspaces?.length,
      workspace_data: regulation.user_workspaces?.[0] || null
    };
  },

  // Get regulations for dashboard
  async getDashboardRegulations(options: {
    limit?: number;
    offset?: number;
  } = {}) {
    const { data: regulations, error } = await supabase
      .from('regulations')
      .select(`
        *,
        user_workspaces!left (id)
      `)
      .order('upload_date', { ascending: false })
      .range(options.offset || 0, (options.offset || 0) + (options.limit || 10) - 1);

    if (error) throw error;

    return regulations?.map(reg => ({
      ...reg,
      in_workspace: !!reg.user_workspaces?.length
    })) || [];
  }
};