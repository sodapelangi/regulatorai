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
      .limit(1);

    if (existing && existing.length > 0) {
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
        tempat_penetapan,
        document_type,
        ai_analysis,
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
  },

  // Get dashboard metrics from actual data
  async getDashboardMetrics() {
    // Get total regulations count
    const { count: totalRegulations, error: totalError } = await supabase
      .from('regulations')
      .select('*', { count: 'exact', head: true });

    if (totalError) {
      console.warn('Failed to get total regulations:', totalError);
    }

    // Get today's uploads
    const today = new Date().toISOString().split('T')[0];
    const { count: dailyUpdates, error: dailyError } = await supabase
      .from('regulations')
      .select('*', { count: 'exact', head: true })
      .gte('upload_date', today);

    if (dailyError) {
      console.warn('Failed to get daily updates:', dailyError);
    }

    // Get high impact regulations by sector
    const { data: regulations, error: regError } = await supabase
      .from('regulations')
      .select('sector_impacts');

    if (regError) {
      console.warn('Failed to get sector impacts:', regError);
    }

    // Count high impact by sector
    const highImpactRegulations: Record<string, number> = {};
    regulations?.forEach(reg => {
      if (reg.sector_impacts && Array.isArray(reg.sector_impacts)) {
        reg.sector_impacts.forEach((impact: any) => {
          if (impact.impact_level === 'High') {
            const sector = impact.sector;
            highImpactRegulations[sector] = (highImpactRegulations[sector] || 0) + 1;
          }
        });
      }
    });

    // Generate weekly trend (simplified - last 7 days)
    const weeklyTrend = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const { count: dayRegulations } = await supabase
        .from('regulations')
        .select('*', { count: 'exact', head: true })
        .gte('upload_date', dateStr)
        .lt('upload_date', new Date(date.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

      weeklyTrend.push({
        date: dateStr,
        regulations: dayRegulations || 0,
        highImpact: Math.floor((dayRegulations || 0) * 0.3) // Estimate 30% high impact
      });
    }

    return {
      totalRegulations: totalRegulations || 0,
      dailyUpdates: dailyUpdates || 0,
      highImpactRegulations,
      weeklyTrend
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

// User Checklist API - Direct Supabase calls
export const userChecklistApi = {
  // Add item to user checklist
  async addChecklistItem(regulationId: string, task: string, articleReference?: string) {
    // Get current user checklist
    const { data: regulation, error: fetchError } = await supabase
      .from('regulations')
      .select('user_checklist')
      .eq('id', regulationId)
      .single();

    if (fetchError) throw fetchError;

    const currentChecklist = regulation.user_checklist || [];
    const newItem = {
      id: Date.now().toString(),
      task: task.trim(),
      completed: false,
      created_at: new Date().toISOString(),
      article_reference: articleReference || null,
      source: 'user'
    };

    const updatedChecklist = [...currentChecklist, newItem];

    const { data, error } = await supabase
      .from('regulations')
      .update({ user_checklist: updatedChecklist })
      .eq('id', regulationId)
      .select('user_checklist')
      .single();

    if (error) throw error;
    return { data: newItem, message: 'Checklist item added successfully' };
  },

  // Update checklist item (toggle completion or edit task)
  async updateChecklistItem(regulationId: string, itemId: string, updates: {
    completed?: boolean;
    task?: string;
    article_reference?: string;
  }) {
    // Get current user checklist
    const { data: regulation, error: fetchError } = await supabase
      .from('regulations')
      .select('user_checklist')
      .eq('id', regulationId)
      .single();

    if (fetchError) throw fetchError;

    const currentChecklist = regulation.user_checklist || [];
    const updatedChecklist = currentChecklist.map(item => 
      item.id === itemId 
        ? { ...item, ...updates, updated_at: new Date().toISOString() }
        : item
    );

    const { data, error } = await supabase
      .from('regulations')
      .update({ user_checklist: updatedChecklist })
      .eq('id', regulationId)
      .select('user_checklist')
      .single();

    if (error) throw error;
    return { data: updatedChecklist, message: 'Checklist item updated successfully' };
  },

  // Remove item from user checklist
  async removeChecklistItem(regulationId: string, itemId: string) {
    // Get current user checklist
    const { data: regulation, error: fetchError } = await supabase
      .from('regulations')
      .select('user_checklist')
      .eq('id', regulationId)
      .single();

    if (fetchError) throw fetchError;

    const currentChecklist = regulation.user_checklist || [];
    const updatedChecklist = currentChecklist.filter(item => item.id !== itemId);

    const { data, error } = await supabase
      .from('regulations')
      .update({ user_checklist: updatedChecklist })
      .eq('id', regulationId)
      .select('user_checklist')
      .single();

    if (error) throw error;
    return { data: updatedChecklist, message: 'Checklist item removed successfully' };
  },

  // Copy AI checklist items to user checklist
  async copyAIChecklistToUser(regulationId: string) {
    // Get both checklists
    const { data: regulation, error: fetchError } = await supabase
      .from('regulations')
      .select('ai_checklist, user_checklist')
      .eq('id', regulationId)
      .single();

    if (fetchError) throw fetchError;

    const aiChecklist = regulation.ai_checklist || [];
    const currentUserChecklist = regulation.user_checklist || [];

    // Convert AI items to user items with new IDs
    const copiedItems = aiChecklist.map(aiItem => ({
      id: `copied_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      task: aiItem.task,
      completed: false,
      created_at: new Date().toISOString(),
      article_reference: aiItem.article_reference || null,
      source: 'user',
      copied_from_ai: true
    }));

    const updatedUserChecklist = [...currentUserChecklist, ...copiedItems];

    const { data, error } = await supabase
      .from('regulations')
      .update({ user_checklist: updatedUserChecklist })
      .eq('id', regulationId)
      .select('user_checklist')
      .single();

    if (error) throw error;
    return { data: copiedItems, message: 'AI checklist items copied to user checklist' };
  }
};

// Helper functions (move outside of regulationApi object)
function transformSectorImpacts(sectorImpacts: any) {
  if (!sectorImpacts || !Array.isArray(sectorImpacts)) {
    return [];
  }
  
  return sectorImpacts.map(impact => ({
    sector: impact.sector,
    importance: impact.impact_level?.toLowerCase() || 'medium',
    aiConfidence: impact.confidence || 0.8
  }));
}

function generateDefaultChecklist(regulation: any) {
  return [
    {
      id: '1',
      task: 'Review regulation requirements',
      completed: false,
      isAiGenerated: true
    },
    {
      id: '2', 
      task: 'Assess compliance impact',
      completed: false,
      isAiGenerated: true
    },
    {
      id: '3',
      task: 'Consult with legal team',
      completed: false,
      isAiGenerated: true
    }
  ];
}

function getDefaultAiAnalysis() {
  return {
    confidence: 0.0,
    background: 'AI analysis not yet available for this regulation.',
    keyPoints: [],
    oldNewComparison: [],
    whyItMattersForBusiness: 'Business impact analysis not yet available.'
  };
}

// Regulation API helpers
export const regulationApi = {
  // Get regulation with workspace status
  async getRegulationWithContext(regulationId: string) {
    const { data: regulation, error: regError } = await supabase
      .from('regulations')
      .select(`
        *,
        document_chunks!left (
          id,
          chunk_level,
          chunk_type,
          content,
          title
        ),
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

    // Transform to expected format for RegulationDetail component
    const transformedRegulation = {
      id: regulation.id,
      title: regulation.judul_lengkap,
      number: regulation.nomor,
      establishedDate: regulation.tanggal_penetapan || regulation.upload_date,
      promulgatedDate: regulation.tanggal_pengundangan || regulation.tanggal_penetapan || regulation.upload_date,
      description: regulation.tentang || 'No description available',
      about: regulation.tentang || 'No description available',
      impactedSectors: transformSectorImpacts(regulation.sector_impacts),
      location: regulation.tempat_penetapan || 'Unknown',
      documentType: regulation.document_type || 'Unknown',
      status: regulation.status,
      fullText: {
        new: regulation.full_text || 'Full text not available'
      },
      keyChanges: [],
      whyItMatters: 'Analysis not available',
      aiChecklist: regulation.ai_checklist || [],
      userChecklist: regulation.user_checklist || [],
      aiAnalysis: regulation.ai_analysis || getDefaultAiAnalysis(),
      background: {
        context: regulation.ai_analysis?.background || 'Background analysis not available'
      },
      inWorkspace: !!regulation.user_workspaces?.length,
      workspace_data: regulation.user_workspaces?.[0] || null,
      viewedAt: new Date().toISOString()
    };

    return transformedRegulation;
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