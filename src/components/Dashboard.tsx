import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Calendar, Clock, FileText, TrendingUp, Plus, CheckCircle } from 'lucide-react';
import { RegulationsList } from './RegulationsList';
import { MetricsCards } from './MetricsCards';
import { TrendChart } from './TrendChart';
import { SectorImpactChart } from './SectorImpactChart';
import { recentRegulationsApi, workspaceApi } from '../lib/api';
import { toast } from 'sonner';

interface DashboardProps {
  onViewRegulation: (regulationId: string) => void;
}

interface TodoItem {
  id: string;
  task: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
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
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [newTodoTask, setNewTodoTask] = useState('');

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

  const handleAddTodo = () => {
    if (newTodoTask.trim()) {
      const newTodo: TodoItem = {
        id: Date.now().toString(),
        task: newTodoTask.trim(),
        completed: false,
        priority: "medium"
      };
      setTodos([...todos, newTodo]);
      setNewTodoTask("");
    }
  };

  const toggleTodo = (id: string) => {
    setTodos(prev => 
      prev.map(todo => 
        todo.id === id 
          ? { ...todo, completed: !todo.completed }
          : todo
      )
    );
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

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Regulations */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Recent Regulations
              </CardTitle>
              <CardDescription>
                Latest regulatory updates and documents
              </CardDescription>
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

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full justify-start" variant="outline">
                <FileText className="mr-2 h-4 w-4" />
                Upload Document
              </Button>
            </CardContent>
          </Card>

          {/* Todo List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Tasks
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Add new task..."
                  value={newTodoTask}
                  onChange={(e) => setNewTodoTask(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddTodo()}
                />
                <Button size="sm" onClick={handleAddTodo}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-2">
                {todos.map((todo) => (
                  <div
                    key={todo.id}
                    className="flex items-center gap-2 p-2 rounded border"
                  >
                    <input
                      type="checkbox"
                      checked={todo.completed}
                      onChange={() => toggleTodo(todo.id)}
                      className="rounded"
                    />
                    <span className={todo.completed ? 'line-through text-muted-foreground' : ''}>
                      {todo.task}
                    </span>
                  </div>
                ))}
                {todos.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No tasks yet. Add one above!
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TrendChart data={metrics.weeklyTrend} />
        <SectorImpactChart metrics={metrics} regulations={regulations} />
      </div>
    </div>
  );
}