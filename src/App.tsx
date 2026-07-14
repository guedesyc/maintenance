import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import ProtectedAdminRoute from "./components/ProtectedAdminRoute";
import AdminLayout from "./components/AdminLayout";
import LoadingSpinner from "./components/LoadingSpinner";

const Home = lazy(() => import("./pages/Home"));
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminRegistrations = lazy(() => import("./pages/AdminRegistrations"));
const AdminUnits = lazy(() => import("./pages/AdminUnits"));
const AdminEquipment = lazy(() => import("./pages/AdminEquipment"));
const AdminImports = lazy(() => import("./pages/AdminImports"));
const AdminExport = lazy(() => import("./pages/AdminExport"));

export default function App() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <LoadingSpinner label="Carregando aplicacao..." />
        </div>
      }
    >
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route
          path="/admin"
          element={
            <ProtectedAdminRoute>
              <AdminLayout />
            </ProtectedAdminRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="registros" element={<AdminRegistrations />} />
          <Route path="unidades" element={<AdminUnits />} />
          <Route path="equipamentos" element={<AdminEquipment />} />
          <Route path="importacoes" element={<AdminImports />} />
          <Route path="exportar" element={<AdminExport />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
