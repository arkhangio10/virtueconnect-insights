import { useState } from "react";
import AppSidebar from "@/components/AppSidebar";
import NGODashboard from "@/components/dashboard/NGODashboard";
import PatientSafeView from "@/components/patientsafe/PatientSafeView";

const Index = () => {
  const [activeView, setActiveView] = useState<"dashboard" | "patientsafe">("dashboard");

  return (
    <div className="flex min-h-screen w-full bg-background">
      <AppSidebar activeView={activeView} onViewChange={setActiveView} />
      <main className="flex-1 p-6 overflow-auto">
        {activeView === "dashboard" ? <NGODashboard /> : <PatientSafeView />}
      </main>
    </div>
  );
};

export default Index;
