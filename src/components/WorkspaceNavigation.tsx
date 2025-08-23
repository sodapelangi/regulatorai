import { Button } from "./ui/button";
import { Badge } from "./ui/badge";

interface WorkspaceNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  workspaceCount: number;
  historyCount: number;
}

export function WorkspaceNavigation({ activeTab, onTabChange, workspaceCount, historyCount }: WorkspaceNavigationProps) {
  return (
    <div className="border-b bg-card/50">
      <div className="flex space-x-1 p-1">
        <Button
          variant={activeTab === "history" ? "default" : "ghost"}
          onClick={() => onTabChange("history")}
          size="sm"
          className="relative"
        >
          Viewed Regulations
          <Badge variant="secondary" className="ml-2 px-1.5 py-0.5 text-xs">
            {historyCount}
          </Badge>
        </Button>
        <Button
          variant={activeTab === "workspace" ? "default" : "ghost"}
          onClick={() => onTabChange("workspace")}
          size="sm"
          className="relative"
        >
          My Workspace
          <Badge variant="secondary" className="ml-2 px-1.5 py-0.5 text-xs">
            {workspaceCount}
          </Badge>
        </Button>
      </div>
    </div>
  );
}