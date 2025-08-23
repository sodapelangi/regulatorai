import { useState, useEffect } from "react";
import { WorkspaceNavigation } from "./WorkspaceNavigation";
import { RegulationDetail } from "./RegulationDetail";
import { HistoryPage } from "./HistoryPage";
import { MyWorkspace } from "./MyWorkspace";
import { mockDetailedRegulations, mockWorkspaceItems, mockViewHistory } from "../data/mockData";

interface IntelligenceWorkspaceProps {
  initialRegulationId?: string | null;
  onBackToDashboard?: () => void;
}

export function IntelligenceWorkspace({ initialRegulationId, onBackToDashboard }: IntelligenceWorkspaceProps) {
  const [activeTab, setActiveTab] = useState("workspace");
  const [selectedRegulationId, setSelectedRegulationId] = useState<string | null>(null);

  // Handle initial regulation ID from dashboard
  useEffect(() => {
    if (initialRegulationId) {
      setSelectedRegulationId(initialRegulationId);
      setActiveTab("details");
    }
  }, [initialRegulationId]);

  const handleViewRegulation = (regulationId: string) => {
    setSelectedRegulationId(regulationId);
    setActiveTab("details");
  };

  const handleBackToList = () => {
    setSelectedRegulationId(null);
    setActiveTab("workspace");
    
    // If this was opened from dashboard, go back to dashboard
    if (initialRegulationId && onBackToDashboard) {
      onBackToDashboard();
    }
  };

  const handleAddToWorkspace = () => {
    // In a real app, this would update the backend
    console.log("Added to workspace");
  };

  const handleUpdateSectorImpact = (sectorIndex: number, importance: string) => {
    // In a real app, this would update the backend
    console.log("Updated sector impact:", sectorIndex, importance);
  };

  const handleToggleChecklistItem = (itemId: string) => {
    // In a real app, this would update the backend
    console.log("Toggled checklist item:", itemId);
  };

  const selectedRegulation = selectedRegulationId 
    ? mockDetailedRegulations.find(r => r.id === selectedRegulationId)
    : null;

  // Show regulation detail if one is selected
  if (selectedRegulation && activeTab === "details") {
    return (
      <div className="space-y-6">
        <RegulationDetail
          regulation={selectedRegulation}
          onBack={handleBackToList}
          onAddToWorkspace={handleAddToWorkspace}
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
        workspaceCount={mockWorkspaceItems.length}
        historyCount={mockViewHistory.length}
      />

      {/* Content based on active tab */}
      {activeTab === "history" && (
        <HistoryPage onViewRegulation={handleViewRegulation} />
      )}
      
      {activeTab === "workspace" && (
        <MyWorkspace onViewRegulation={handleViewRegulation} />
      )}

      {/* Default to workspace if no valid tab */}
      {!["history", "workspace", "details"].includes(activeTab) && (
        <MyWorkspace onViewRegulation={handleViewRegulation} />
      )}
    </div>
  );
}