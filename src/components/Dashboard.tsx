import { useState, useEffect } from "react";
import { MetricsCards } from "./MetricsCards";
import { SectorImpactChart } from "./SectorImpactChart";
import { RegulationsList } from "./RegulationsList";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Checkbox } from "./ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { Info, Plus, CheckCircle2, Calendar } from "lucide-react";
import { workspaceApi, viewTrackingApi, recentRegulationsApi } from "../lib/api";
import { toast } from "sonner";

interface DashboardProps {
  onViewRegulation?: (regulationId: string) => void;
}

interface TodoItem {
  id: string;
  task: string;
  completed: boolean;
  dueDate?: string;
  priority: 'low' | 'medium' | 'high';
}

export function Dashboard({ onViewRegulation }: DashboardProps) {
  const [timePeriod, setTimePeriod] = useState("7d");
  const [regulations, setRegulations] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [newTodoTask, setNewTodoTask] = useState("");
  const [todos, setTodos] = useState<TodoItem[]>([
    { id: "1", task: "Review new financial regulations impact", completed: false, dueDate: "2024-08-25", priority: "high" },
    { id: "2", task: "Update compliance documentation", completed: true, dueDate: "2024-08-20", priority: "medium" },
    { id: "3", task: "Schedule team meeting on digital regulations", completed: false, dueDate: "2024-08-22", priority: "medium" },
  ]);

  // Load recent regulations on component mount
  useEffect(() => {
    loadRecentRegulations();
    loadDashboardMetrics();
  }, []);

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
        number: reg.nomor,
        establishedDate: reg.tanggal_penetapan || reg.upload_date,
        promulgatedDate: reg.tanggal_penetapan || reg.upload_date,
        description: reg.tentang || 'No description available',
        about: reg.tentang || 'No description available',
        impactedSectors: transformSectorImpacts(reg.sector_impacts),
        location: reg.instansi || 'Unknown',
        status: reg.status || 'active',
        inWorkspace: reg.in_workspace
      }));
      
      setRegulations(transformedRegulations);
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
      const metricsData = await recentRegulationsApi.getDashboardMetrics();
      setMetrics(metricsData);
    } catch (error) {
      console.error('Failed to load dashboard metrics:', error);
      toast.error('Failed to load dashboard metrics');
    } finally {
      setMetricsLoading(false);
    }
  };

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

  const handleAddTodo = () => {
  const loadDashboardMetrics = async () => {
    try {
      setMetricsLoading(true);
      const metricsData = await recentRegulationsApi.getDashboardMetrics();
      setMetrics(metricsData);
    } catch (error) {
      console.error('Failed to load dashboard metrics:', error);
      toast.error('Failed to load dashboard metrics');
    } finally {
      setMetricsLoading(false);
    }
  };

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
      setRegulations(regulations.map(reg => 
        reg.id === regulationId ? { ...reg, inWorkspace: true } : reg
      ));
      
      toast.success('Added to workspace successfully');
    } catch (error) {
      console.error('Failed to add to workspace:', error);
      toast.error('Failed to add to workspace');
    }
  };

  const handleViewRegulation = async (regulationId: string) => {
    // Record the view
    try {
      await viewTrackingApi.recordView(regulationId, {
        source: 'dashboard'
      });
    } catch (error) {
      console.error('Failed to record view:', error);
    }
    
    if (onViewRegulation) {
      onViewRegulation(regulationId);
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Header with Time Period Selector */}
      <div className="border-b border-gray-200 pb-6">
        <div className="flex items-start justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">Regulatory Intelligence Dashboard</h1>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1 px-2 py-1 bg-amber-50 border border-amber-200 rounded-md cursor-help">
                      <Info className="h-3 w-3 text-amber-600" />
                      <span className="text-xs font-medium text-amber-700">AI Powered</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-sm">
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-amber-700">
                        ⚠️ AI Analysis - Verify Before Acting
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Our AI provides regulatory insights for guidance. Always consult legal experts for compliance decisions.{" "}
                        <span className="text-blue-500 underline cursor-pointer">Learn More</span>
                      </p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            
            <p className="text-lg text-muted-foreground max-w-2xl">
              Monitor regulatory changes across Indonesian sectors with AI-powered impact analysis and compliance insights.
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Time Period:</span>
            </div>
            <Select value={timePeriod} onValueChange={setTimePeriod}>
              <SelectTrigger className="w-36 border-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1d">Last 24 hours</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Metrics Cards */}
      {metricsLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-20 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : metrics ? (
        <MetricsCards metrics={metrics} />
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          Failed to load metrics
        </div>
      )}

      {/* Charts Section */}
      {!metricsLoading && metrics && (
        <div className="grid gap-6">
          <SectorImpactChart metrics={metrics} />
        </div>
      )}

      {/* Recent Regulations List with Pagination */}
      <Card className="border-2 border-gray-100">
        <CardHeader className="bg-gray-50/50">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">Recent Regulations</CardTitle>
            <Badge variant="secondary" className="text-xs">
              {regulations.length} regulations
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Latest regulatory updates with AI-powered impact analysis
          </p>
        </CardHeader>
        <CardContent className="p-6">
          <RegulationsList 
            regulations={regulations} 
            onViewRegulation={handleViewRegulation}
            onAddToWorkspace={handleAddToWorkspace}
            showPagination={false}
            loading={loading}
          />
        </CardContent>
      </Card>
    </div>
  );
}