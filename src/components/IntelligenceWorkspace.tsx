import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { WorkspaceNavigation } from "./WorkspaceNavigation";
import { RegulationDetail } from "./RegulationDetail";
import { MyWorkspace } from "./MyWorkspace";
import { regulationApi, workspaceApi } from "../lib/api";
import { toast } from "sonner";

interface IntelligenceWorkspaceProps {
  initialRegulationId?: string | null;
  onBackToDashboard?: () => void;
}

export function IntelligenceWorkspace({ initialRegulationId, onBackToDashboard }: IntelligenceWorkspaceProps) {
  const [activeTab, setActiveTab] = useState("workspace");
  const [selectedRegulationId, setSelectedRegulationId] = useState<string | null>(null);
  const [selectedRegulation, setSelectedRegulation] = useState<any>(null);
  const [workspaceCount, setWorkspaceCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Handle initial regulation ID from dashboard
  useEffect(() => {
    if (initialRegulationId) {
      setSelectedRegulationId(initialRegulationId);
      setActiveTab("details");
      loadRegulationDetail(initialRegulationId);
    }
  }, [initialRegulationId]);

  // Load workspace count
  useEffect(() => {
    loadWorkspaceCount();
  }, []);

  const loadWorkspaceCount = async () => {
    try {
      const response = await workspaceApi.getWorkspace();
      setWorkspaceCount(response.count || 0);
    } catch (error) {
      console.error('Failed to load workspace count:', error);
    }
  };

  const loadRegulationDetail = async (regulationId: string) => {
    try {
      setLoading(true);
      const regulation = await regulationApi.getRegulationWithContext(regulationId);
      setSelectedRegulation(regulation);
    } catch (error) {
      console.error('Failed to load regulation detail:', error);
      toast.error('Failed to load regulation details');
      setSelectedRegulation(null);
    } finally {
      setLoading(false);
    }
  };
  const handleViewRegulation = (regulationId: string) => {
    setSelectedRegulationId(regulationId);
    setActiveTab("details");
    loadRegulationDetail(regulationId);
  };

  const handleBackToList = () => {
    setSelectedRegulationId(null);
    setSelectedRegulation(null);
    setActiveTab("workspace");
    
    // If this was opened from dashboard, go back to dashboard
    if (initialRegulationId && onBackToDashboard) {
      onBackToDashboard();
    }
  };

  const handleRegulationUpdated = () => {
    // Reload the regulation data after updates (like re-analysis)
    if (selectedRegulationId) {
      loadRegulationDetail(selectedRegulationId);
    }
  };

  const handleAddToWorkspace = () => {
    // In a real app, this would update the backend
    console.log("Added to workspace");
    loadWorkspaceCount(); // Refresh count
  };

  const handleUpdateSectorImpact = (sectorIndex: number, importance: string) => {
    // In a real app, this would update the backend
    console.log("Updated sector impact:", sectorIndex, importance);
  };

  const handleToggleChecklistItem = (itemId: string) => {
    // In a real app, this would update the backend
    console.log("Toggled checklist item:", itemId);
  };

  // Show regulation detail if one is selected
  if (selectedRegulationId && activeTab === "details") {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      );
    }

    if (!selectedRegulation) {
      return (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Regulation not found or failed to load.</p>
          <Button onClick={handleBackToList} className="mt-4">
            Back to Workspace
          </Button>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <RegulationDetail
          regulation={selectedRegulation}
          onBack={handleBackToList}
          onAddToWorkspace={handleAddToWorkspace}
          onRegulationUpdated={handleRegulationUpdated}
          onUpdateSectorImpact={handleUpdateSectorImpact}
          onToggleChecklistItem={handleToggleChecklistItem}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="space-y-2">
        <h1>Regulatory Intelligence Workspace</h1>
        <p className="text-muted-foreground">
          Detailed analysis, tracking, and workflow management for regulatory changes
        </p>
      </div>

      {/* Sub-navigation */}
      <WorkspaceNavigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        workspaceCount={workspaceCount}
      />

      {/* Content based on active tab */}
      {activeTab === "workspace" && (
        <MyWorkspace 
          onViewRegulation={handleViewRegulation} 
          onWorkspaceCountChange={setWorkspaceCount}
        />
      )}

      {/* Default to workspace if no valid tab */}
      {!["workspace", "details"].includes(activeTab) && (
        <MyWorkspace 
          onViewRegulation={handleViewRegulation} 
          onWorkspaceCountChange={setWorkspaceCount}
        />
      )}
    </div>
  );
}