import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "./ui/dropdown-menu";
import { Bell, Search, Settings, Upload, User, LogOut, FileText, Database } from "lucide-react";
import { useState, useEffect } from "react";
import { recentRegulationsApi, workspaceApi } from "../lib/api";

interface NavigationProps {
  activeMenu: string;
  onMenuChange: (menu: string) => void;
}

export function Navigation({ activeMenu, onMenuChange }: NavigationProps) {
  const [regulationCount, setRegulationCount] = useState(0);
  const [workspaceCount, setWorkspaceCount] = useState(0);

  useEffect(() => {
    loadCounts();
  }, []);

  const loadCounts = async () => {
    try {
      // Get total regulations count
      const metricsData = await recentRegulationsApi.getDashboardMetrics();
      setRegulationCount(metricsData.totalRegulations);

      // Get workspace count
      const workspaceData = await workspaceApi.getWorkspace();
      setWorkspaceCount(workspaceData.count);
    } catch (error) {
      console.error('Failed to load navigation counts:', error);
    }
  };

  return (
    <nav className="border-b bg-card">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between items-center">
          <div className="flex items-center space-x-8">
            <div className="flex-shrink-0">
              <h1 className="text-xl font-semibold text-primary">RegulatorAI</h1>
            </div>
            <div className="flex space-x-1">
              <Button
                variant={activeMenu === "dashboard" ? "default" : "ghost"}
                onClick={() => onMenuChange("dashboard")}
                className="relative"
              >
                Regulatory Intelligence
                <Badge variant="secondary" className="ml-2 px-1.5 py-0.5 text-xs">
                  {regulationCount}
                </Badge>
              </Button>
              <Button
                variant={activeMenu.startsWith("workspace") ? "default" : "ghost"}
                onClick={() => onMenuChange("workspace")}
                className="relative"
              >
                Intelligence Workspace
                <Badge variant="secondary" className="ml-2 px-1.5 py-0.5 text-xs">
                  {workspaceCount}
                </Badge>
              </Button>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="sm" className="relative">
              <Bell className="h-4 w-4" />
              <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center">
                3
              </Badge>
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => onMenuChange("settings")}
              className="flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </Button>
      
          </div>
        </div>
      </div>
    </nav>
  );
}