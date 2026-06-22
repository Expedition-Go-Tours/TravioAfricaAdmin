import { Navigate } from "react-router-dom";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const hasRole = !!localStorage.getItem("adminRoleId");

  if (!hasRole) {
    return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
}
