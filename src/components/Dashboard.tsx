import { useState } from "react";
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
import { mockMetrics, mockRegulations, mockDetailedRegulations } from "../data/mockData";

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
  const [currentPage, setCurrentPage] = useState(1);
  const [newTodoTask, setNewTodoTask] = useState("");
  const [todos, setTodos] = useState<TodoItem[]>([
    { id: "1", task: "Review new financial regulations impact", completed: false, dueDate: "2024-08-25", priority: "high" },
    { id: "2", task: "Update compliance documentation", completed: true, dueDate: "2024-08-20", priority: "medium" },
    { id: "3", task: "Schedule team meeting on digital regulations", completed: false, dueDate: "2024-08-22", priority: "medium" },
  ]);

  const regulationsPerPage = 5;
  const totalPages = Math.ceil(mockRegulations.length / regulationsPerPage);
  const startIndex = (currentPage - 1) * regulationsPerPage;
  const currentRegulations = mockRegulations.slice(startIndex, startIndex + regulationsPerPage);

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

  const handleToggleTodo = (todoId: string) => {
    setTodos(todos.map(todo => 
      todo.id === todoId ? { ...todo, completed: !todo.completed } : todo
    ));
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  const handleAddToWorkspace = (regulationId: string) => {
    // Update the regulation to show it's been added to workspace
    const updatedRegulation = mockDetailedRegulations.find(r => r.id === regulationId);
    if (updatedRegulation) {
      updatedRegulation.inWorkspace = true;
    }
  };

  // Filter metrics based on time period (simplified for demo)
  const getFilteredMetrics = () => {
    let multiplier = 1;
    switch (timePeriod) {
      case "1d": multiplier = 0.2; break;
      case "7d": multiplier = 1; break;
      case "30d": multiplier = 4; break;
      case "90d": multiplier = 12; break;
    }
    
    // Create new object with multiplied values for all sectors
    const multipliedHighImpact = Object.fromEntries(
      Object.entries(mockMetrics.highImpactRegulations).map(([sector, count]) => [
        sector,
        Math.max(1, Math.round(count * multiplier))
      ])
    );
    
    return {
      ...mockMetrics,
      dailyUpdates: Math.round(mockMetrics.dailyUpdates * multiplier),
      totalRegulations: Math.round(mockMetrics.totalRegulations * multiplier),
      highImpactRegulations: multipliedHighImpact
    };
  };

  const filteredMetrics = getFilteredMetrics();

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
      <MetricsCards metrics={filteredMetrics} />

      {/* Charts Section */}
      <div className="grid gap-6">
        <SectorImpactChart metrics={filteredMetrics} />
      </div>

      {/* Recent Regulations List with Pagination */}
      <Card className="border-2 border-gray-100">
        <CardHeader className="bg-gray-50/50">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">Recent Regulations</CardTitle>
            <Badge variant="secondary" className="text-xs">
              {mockRegulations.length} total regulations
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Latest regulatory updates with AI-powered impact analysis
          </p>
        </CardHeader>
        <CardContent className="p-6">
          <RegulationsList 
            regulations={currentRegulations} 
            onViewRegulation={onViewRegulation}
            onAddToWorkspace={handleAddToWorkspace}
            showPagination={true}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </CardContent>
      </Card>
    </div>
  );
}