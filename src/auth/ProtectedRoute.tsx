import { Navigate } from "react-router-dom";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const token = localStorage.getItem("firebaseToken");
  const role = localStorage.getItem("userRole");

  if (token && role !== "admin") {
    localStorage.removeItem("firebaseToken");
    localStorage.removeItem("userRole");
  }

  if (!token || role !== "admin") {
    return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
}
