import { useEffect, useState, lazy, Suspense } from "react";
import { Routes, Route, Outlet } from "react-router-dom";
import { TopBar } from "./components/TopBar";
import { AddClientDialog } from "./components/AddClientDialog";
import { DashboardPage } from "./pages/DashboardPage";
import { useClients } from "./store/useClients";

// Heavy, rarely-hit routes are code-split.
const ClientProfilePage = lazy(() =>
  import("./pages/ClientProfilePage").then((m) => ({
    default: m.ClientProfilePage,
  })),
);
const ReportPage = lazy(() =>
  import("./pages/ReportPage").then((m) => ({ default: m.ReportPage })),
);
const SignPage = lazy(() =>
  import("./pages/SignPage").then((m) => ({ default: m.SignPage })),
);
const DocSignPage = lazy(() =>
  import("./pages/DocSignPage").then((m) => ({ default: m.DocSignPage })),
);
const AgentDashboardPage = lazy(() =>
  import("./pages/AgentDashboardPage").then((m) => ({
    default: m.AgentDashboardPage,
  })),
);
const SettingsPage = lazy(() =>
  import("./pages/SettingsPage").then((m) => ({ default: m.SettingsPage })),
);
const DocumentsPage = lazy(() =>
  import("./pages/DocumentsPage").then((m) => ({ default: m.DocumentsPage })),
);

/** Shell for the internal CRM pages — owns polling + the add-client dialog. */
function CrmLayout() {
  const [addOpen, setAddOpen] = useState(false);
  const init = useClients((s) => s.init);
  const stop = useClients((s) => s.stop);

  useEffect(() => {
    init();
    return stop;
  }, [init, stop]);

  return (
    <div className="min-h-screen">
      <TopBar onAdd={() => setAddOpen(true)} />
      <Outlet />
      {addOpen && <AddClientDialog onClose={() => setAddOpen(false)} />}
    </div>
  );
}

const Fallback = () => (
  <div className="grid min-h-screen place-items-center text-sm text-slate-500">
    טוען…
  </div>
);

export default function App() {
  return (
    <Suspense fallback={<Fallback />}>
      <Routes>
        {/* standalone, client-facing, public */}
        <Route path="/report/:reportId" element={<ReportPage />} />
        <Route path="/sign/:token" element={<SignPage />} />
        <Route path="/docsign/:token" element={<DocSignPage />} />

        {/* internal CRM */}
        <Route element={<CrmLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/client/:id" element={<ClientProfilePage />} />
          <Route path="/performance" element={<AgentDashboardPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/documents" element={<DocumentsPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
