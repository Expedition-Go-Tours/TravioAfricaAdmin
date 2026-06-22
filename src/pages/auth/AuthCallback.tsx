import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import api from "@/lib/axios";

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState("Completing sign in...");

  useEffect(() => {
    const accessToken = searchParams.get("accessToken");
    const refreshToken = searchParams.get("refreshToken");

    if (!accessToken || !refreshToken) {
      setStatus("Invalid response from provider. Redirecting...");
      setTimeout(() => navigate("/admin/login", { replace: true }), 2000);
      return;
    }

    convertToCookies(accessToken, refreshToken);
  }, [searchParams, navigate]);

  async function convertToCookies(accessToken: string, refreshToken: string) {
    try {
      await api.post("/auth/set-cookies", { accessToken, refreshToken });
    } catch {
      setStatus("Authentication failed. Redirecting...");
      setTimeout(() => navigate("/admin/login", { replace: true }), 2000);
      return;
    }

    try {
      const res = await api.get("/admin/me");
      const userData = res.data?.data;

      if (!userData?.adminRoleId) {
        setStatus("You do not have admin access. Redirecting...");
        setTimeout(() => navigate("/admin/login", { replace: true }), 2000);
        return;
      }

      localStorage.setItem("adminRoleId", userData.adminRoleId);
      localStorage.setItem("adminRole", JSON.stringify(userData.adminRole));

      const { getDefaultRoute } = await import("@/lib/permissions");
      window.location.href = getDefaultRoute();
    } catch {
      setStatus("Access denied. Redirecting...");
      setTimeout(() => navigate("/admin/login", { replace: true }), 2000);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-green-50 via-white to-green-50/60">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
        <p className="text-sm text-gray-500">{status}</p>
      </div>
    </div>
  );
}
