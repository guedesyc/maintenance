import { Route, Routes } from "react-router-dom";
import ProtectedAdminRoute from "./components/ProtectedAdminRoute";
import AdminLayout from "./components/AdminLayout";
import Home from "./pages/Home";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import AdminRegistrations from "./pages/AdminRegistrations";
import AdminUnits from "./pages/AdminUnits";
import AdminEquipment from "./pages/AdminEquipment";
import AdminImports from "./pages/AdminImports";
import AdminExport from "./pages/AdminExport";

export default function App() {
  return (
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
  );
}
