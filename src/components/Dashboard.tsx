import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Calendar, Clock, FileText, TrendingUp, Plus, CheckCircle, Brain } from 'lucide-react';
import { RegulationsList } from './RegulationsList';
import { MetricsCards } from './MetricsCards';
import { SectorImpactChart } from './SectorImpactChart';
import { recentRegulationsApi, workspaceApi } from '../lib/api';
import { toast } from 'sonner';

interface DashboardProps {
  onViewRegulation: (regulationId: string) => void;
}

interface Regulation {
  id: string;
  title: string;
  number: string;
  establishedDate: string;
  promulgatedDate: string;
  description: string;
  about: string;
  impactedSectors: Array<{
    sector: string;
    importance: string;
    aiConfidence: number;
  }>;
  location: string;
  status: string;
  inWorkspace: boolean;
}

interface Metrics {
  totalRegulations: number;
  dailyUpdates: number;
  highImpactRegulations: Record<string, number>;
  weeklyTrend: Array<{
    date: string;
    regulations: number;
    highImpact: number;
  }>;
}

export function Dashboard({ onViewRegulation }: DashboardProps) {
  const [regulations, setRegulations] = useState<Regulation[]>([]);
  const [metrics, setMetrics] = useState<Metrics>({
    totalRegulations: 0,
    dailyUpdates: 0,
    highImpactRegulations: {},
    weeklyTrend: []
  });
  const [loading, setLoading] = useState(true);
  const [metricsLoading, setMetricsLoading] = useState(true);

  useEffect(() => {
    loadRecentRegulations();
    loadDashboardMetrics();
  }, []);

  // Transform AI sector impacts to expected format
  const transformSectorImpacts = (sectorImpacts: any) => {
    if (!sectorImpacts || !Array.isArray(sectorImpacts)) {
      return [];
    }
    
    return sectorImpacts.map(impact => ({
      sector: impact.sector,
      importance: impact.impact_level?.toLowerCase() || 'medium',
      aiConfidence: impact.confidence || 0.8
    }));
  };

  const loadRecentRegulations = async () => {
    try {
      setLoading(true);
      const response = await recentRegulationsApi.getRecentRegulations({
        limit: 10
      });
      
      // Transform data to match expected format
      const transformedRegulations = response.data.map(reg => ({
        id: reg.id,
        title: reg.judul_lengkap || 'Untitled Regulation',
        number: reg.nomor || 'No Number',
        establishedDate: reg.tanggal_penetapan || reg.upload_date,
        promulgatedDate: reg.tanggal_pengundangan || reg.tanggal_penetapan || reg.upload_date,
        description: reg.tentang || 'No description available',
        about: reg.tentang || 'No description available',
        impactedSectors: transformSectorImpacts(reg.sector_impacts),
        location: reg.instansi || 'Unknown',
        status: reg.status || 'active',
        inWorkspace: reg.in_workspace || false
      }));
      
      setRegulations(transformedRegulations);
    } catch (error) {
      console.error('Failed to load recent regulations:', error);
      toast.error('Failed to load recent regulations');
      setRegulations([]);
    } finally {
      setLoading(false);
    }
  };

  const loadDashboardMetrics = async () => {
    try {
      setMetricsLoading(true);
      const metricsData = await recentRegulationsApi.getDashboardMetrics();
      setMetrics(metricsData);
    } catch (error) {
      console.error('Failed to load dashboard metrics:', error);
      toast.error('Failed to load dashboard metrics');
      // Set empty metrics on error
      setMetrics({
        totalRegulations: 0,
        dailyUpdates: 0,
        highImpactRegulations: {},
        weeklyTrend: []
      });
    } finally {
      setMetricsLoading(false);
    }
  };

  const handleViewRegulation = (regulationId: string) => {
    onViewRegulation(regulationId);
  };

  const handleAddToWorkspace = async (regulationId: string) => {
    try {
      await workspaceApi.addToWorkspace(regulationId);
      
      // Update local state to reflect the change
      setRegulations(prev => 
        prev.map(reg => 
          reg.id === regulationId 
            ? { ...reg, inWorkspace: true }
            : reg
        )
      );
      toast.success('Regulation added to workspace');
    } catch (error) {
      console.error('Failed to add to workspace:', error);
      toast.error('Failed to add to workspace');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of regulations and compliance activities
          </p>
        </div>
        <Badge variant="secondary" className="px-3 py-1">
          {regulations.length} regulations
        </Badge>
      </div>

      {/* Metrics Cards */}
      <MetricsCards metrics={metrics} />

      {/* Sector Impact Chart */}
      <div className="space-y-6">
        <SectorImpactChart metrics={metrics} regulations={regulations} />
      </div>

      {/* Recent Regulations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Recent Regulations
          </CardTitle>
          <CardDescription>
            Latest regulatory updates and documents
          </CardDescription>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-4">
            <div className="flex items-start gap-2">
              <Brain className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-amber-700">
                <strong>AI Generated</strong> - Please double check all AI analysis and sector impacts with legal experts
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading regulations...</p>
            </div>
          ) : regulations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No regulations available. Upload a document to get started.
            </div>
          ) : (
            <RegulationsList
              regulations={regulations}
              loading={loading}
              onViewRegulation={handleViewRegulation}
              onAddToWorkspace={handleAddToWorkspace}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}