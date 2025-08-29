import { Button } from "./ui/button";
import { Badge } from "./ui/badge";

interface WorkspaceNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  workspaceCount: number;
}

export function WorkspaceNavigation({ activeTab, onTabChange, workspaceCount }: WorkspaceNavigationProps) {
  return (
    <div className="border-b bg-card/50">
      <div className="flex justify-center p-1">
        <Button
          variant={activeTab === "workspace" ? "default" : "ghost"}
          onClick={() => onTabChange("workspace")}
          size="sm"
          className="relative px-6"
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