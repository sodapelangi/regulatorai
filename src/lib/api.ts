import { supabase } from './supabase';

// Workspace API
export const workspaceApi = {
  // Get all workspace items
  async getWorkspace() {
    const { data, error } = await supabase.functions.invoke('workspace-management', {
      method: 'GET'
    });
    
    if (error) throw error;
    return data;
  },

  // Add regulation to workspace
  async addToWorkspace(regulationId: string, options: {
    priority?: 'low' | 'medium' | 'high';
    status?: 'pending' | 'in-progress' | 'completed';
    notes?: string;
  } = {}) {
    const { data, error } = await supabase.functions.invoke('workspace-management', {
      method: 'POST',
      body: {
        regulation_id: regulationId,
        ...options
      }
    });
    
    if (error) throw error;
    return data;
  },

  // Update workspace item
  async updateWorkspaceItem(workspaceId: string, updates: {
    priority?: 'low' | 'medium' | 'high';
    status?: 'pending' | 'in-progress' | 'completed';
    notes?: string;
  }) {
    const { data, error } = await supabase.functions.invoke('workspace-management', {
      method: 'PUT',
      body: updates
    });
    
    if (error) throw error;
    return data;
  },

  // Remove from workspace
  async removeFromWorkspace(workspaceId: string) {
    const { data, error } = await supabase.functions.invoke('workspace-management', {
      method: 'DELETE'
    });
    
    if (error) throw error;
    return data;
  },

  // Get workspace statistics
  async getWorkspaceStats() {
    const { data, error } = await supabase.functions.invoke('workspace-management', {
      method: 'GET'
    });
    
    if (error) throw error;
    return data;
  }
};

// View Tracking API
export const viewTrackingApi = {
  // Record a regulation view
  async recordView(regulationId: string, options: {
    viewDurationSeconds?: number;
    source?: string;
  } = {}) {
    const { data, error } = await supabase.functions.invoke('view-tracking', {
      method: 'POST',
      body: {
        regulation_id: regulationId,
        view_duration_seconds: options.viewDurationSeconds || 0,
        source: options.source || 'unknown'
      }
    });
    
    if (error) throw error;
    return data;
  },

  // Get today's view history
  async getViewHistory(options: {
    limit?: number;
    offset?: number;
    search?: string;
  } = {}) {
    const params = new URLSearchParams();
    if (options.limit) params.set('limit', options.limit.toString());
    if (options.offset) params.set('offset', options.offset.toString());
    if (options.search) params.set('search', options.search);

    const { data, error } = await supabase.functions.invoke('view-tracking', {
      method: 'GET'
    });
    
    if (error) throw error;
    return data;
  },

  // Get recent regulations (last 30 days)
  async getRecentRegulations(options: {
    limit?: number;
    offset?: number;
  } = {}) {
    const params = new URLSearchParams();
    if (options.limit) params.set('limit', options.limit.toString());
    if (options.offset) params.set('offset', options.offset.toString());

    const { data, error } = await supabase.functions.invoke('view-tracking', {
      method: 'GET'
    });
    
    if (error) throw error;
    return data;
  },

  // Get view statistics
  async getViewStats() {
    const { data, error } = await supabase.functions.invoke('view-tracking', {
      method: 'GET'
    });
    
    if (error) throw error;
    return data;
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