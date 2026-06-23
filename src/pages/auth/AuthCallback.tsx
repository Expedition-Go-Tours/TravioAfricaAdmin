import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import api from "@/lib/axios";

export default function AuthCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("Completing sign in...");

  useEffect(() => {
    api.get("/admin/me")
      .then((res) => {
        const userData = res.data?.data;

        if (!userData?.adminRoleId) {
          setStatus("You do not have admin access. Redirecting...");
          setTimeout(() => navigate("/admin/login", { replace: true }), 2000);
          return;
        }

        localStorage.setItem("adminRoleId", userData.adminRoleId);
        localStorage.setItem("adminRole", JSON.stringify(userData.adminRole));

        import("@/lib/permissions").then(({ getDefaultRoute }) => {
          window.location.href = getDefaultRoute();
        });
      })
      .catch(() => {
        setStatus("Access denied. Redirecting...");
        setTimeout(() => navigate("/admin/login", { replace: true }), 2000);
      });
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-green-50 via-white to-green-50/60">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
        <p className="text-sm text-gray-500">{status}</p>
      </div>
    </div>
  );
}
