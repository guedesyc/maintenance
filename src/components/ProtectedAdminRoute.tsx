import { Navigate, useLocation } from "react-router-dom";
import type { PropsWithChildren } from "react";
import LoadingSpinner from "./LoadingSpinner";
import { useAdminSession } from "@/hooks/useAdminSession";

export default function ProtectedAdminRoute({ children }: PropsWithChildren) {
  const { loading, session } = useAdminSession();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner label="Verificando sessao administrativa..." />
      </div>
    );
  }

  if (!session.authenticated) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}
