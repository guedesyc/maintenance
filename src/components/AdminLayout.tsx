import { LogOut, LayoutDashboard, ClipboardList, Building2, Package2, Upload, FileSpreadsheet } from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { logoutAdmin } from "@/services/adminApiService";

const links = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/registros", label: "Cadastros", icon: ClipboardList },
  { to: "/admin/unidades", label: "Unidades", icon: Building2 },
  { to: "/admin/equipamentos", label: "Equipamentos", icon: Package2 },
  { to: "/admin/importacoes", label: "Importacoes", icon: Upload },
  { to: "/admin/exportar", label: "Exportar", icon: FileSpreadsheet },
];

export default function AdminLayout() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-haze">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-6 px-4 py-6 lg:flex-row lg:px-6">
        <aside className="panel w-full p-4 lg:sticky lg:top-6 lg:h-fit lg:w-72">
          <div className="rounded-3xl bg-brand-900 px-5 py-6 text-white">
            <p className="text-xs uppercase tracking-[0.25em] text-brand-100">Painel administrativo</p>
            <h1 className="mt-3 text-2xl font-semibold">Equipamentos</h1>
            <p className="mt-2 text-sm text-brand-100">Importe catalogos, acompanhe cadastros e exporte os dados.</p>
          </div>
          <nav className="mt-6 space-y-2">
            {links.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/admin"}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${
                    isActive ? "bg-brand-100 text-brand-800" : "text-stone-600 hover:bg-stone-100"
                  }`
                }
              >
                <Icon className="h-4 w-4" />
                {label}
              </NavLink>
            ))}
          </nav>
          <button
            type="button"
            className="button-secondary mt-6 w-full"
            onClick={async () => {
              await logoutAdmin();
              navigate("/admin/login", { replace: true });
            }}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </button>
        </aside>
        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
