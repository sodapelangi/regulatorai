import { useState } from "react";
import { Navigation } from "./components/Navigation";
import { Dashboard } from "./components/Dashboard";
import { IntelligenceWorkspace } from "./components/IntelligenceWorkspace";
import { IngestionPage } from "./components/IngestionPage";
import { Settings } from "./components/Settings";
import { Toaster } from "./components/ui/sonner";

export default function App() {
  const [activeMenu, setActiveMenu] = useState("dashboard");
  const [selectedRegulationId, setSelectedRegulationId] =
    useState<string | null>(null);

  const handleViewRegulation = (regulationId: string) => {
    setSelectedRegulationId(regulationId);
    setActiveMenu("workspace-details");
  };

  const handleBackToDashboard = () => {
    setSelectedRegulationId(null);
    setActiveMenu("dashboard");
  };

  const handleBackFromUpload = () => {
    setActiveMenu("dashboard");
  };

  const handleBackFromSettings = () => {
    setActiveMenu("dashboard");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation
        activeMenu={activeMenu}
        onMenuChange={setActiveMenu}
      />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {activeMenu === "dashboard" && (
          <Dashboard onViewRegulation={handleViewRegulation} />
        )}
        {activeMenu.startsWith("workspace") && (
          <IntelligenceWorkspace
            initialRegulationId={selectedRegulationId}
            onBackToDashboard={handleBackToDashboard}
          />
        )}
        {activeMenu === "upload-peraturan" && (
          <IngestionPage />
        )}
        {activeMenu === "settings" && (
          <Settings onBack={handleBackFromSettings} />
        )}
      </main>
      <Toaster />
    </div>
  );
}