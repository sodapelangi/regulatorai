import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Calendar, Clock, FileText, TrendingUp, Plus, CheckCircle } from 'lucide-react';
import { RegulationsList } from './RegulationsList';
import { MetricsCards } from './MetricsCards';
import { TrendChart } from './TrendChart';
import { SectorImpactChart } from './SectorImpactChart';
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
  sectorImpacts: number;
  weeklyTrend: Array<{
    date: string;
    count: number;
  }>;
}

export function Dashboard({ onViewRegulation }: DashboardProps) {
  const [regulations, setRegulations] = useState<Regulation[]>([]);
  const [metrics, setMetrics] = useState<Metrics>({
    totalRegulations: 0,
    dailyUpdates: 0,
    sectorImpacts: 0,
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

  const loadRecentRegulations = async () => {
    try {
      setLoading(true);
      // Mock data for now - replace with actual API call
      const mockRegulations: Regulation[] = [
        {
          id: '1',
          title: 'Sample Regulation',
          number: 'REG-001',
          establishedDate: '2024-01-15',
          promulgatedDate: '2024-01-15',
          description: 'Sample regulation description',
          about: 'Sample regulation about',
          impactedSectors: [],
          location: 'Jakarta',
          status: 'active',
          inWorkspace: false
        }
      ];
      setRegulations(mockRegulations);
    } catch (error) {
      console.error('Failed to load recent regulations:', error);
      toast.error('Failed to load recent regulations');
    } finally {
      setLoading(false);
    }
  };

  const loadDashboardMetrics = async () => {
    try {
      setMetricsLoading(true);
      // Mock metrics for now - replace with actual API call
      const mockMetrics: Metrics = {
        totalRegulations: 1,
        dailyUpdates: 0,
        sectorImpacts: 0,
        weeklyTrend: [
          { date: '2024-01-15', count: 1 }
        ]
      };
      setMetrics(mockMetrics);
    } catch (error) {
      console.error('Failed to load dashboard metrics:', error);
      toast.error('Failed to load dashboard metrics');
    } finally {
      setMetricsLoading(false);
    }
  };

  const handleViewRegulation = (regulationId: string) => {
    onViewRegulation(regulationId);
  };

  const handleAddToWorkspace = async (regulationId: string) => {
    try {
      // Mock workspace addition - replace with actual API call
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
      <MetricsCards 
        metrics={metrics}
        loading={metricsLoading}
      />

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
              <RegulationsList
                regulations={regulations}
                loading={loading}
                onViewRegulation={handleViewRegulation}
                onAddToWorkspace={handleAddToWorkspace}
              />
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
        <SectorImpactChart regulations={regulations} />
      </div>
    </div>
  );
}