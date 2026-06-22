import { useState, useCallback } from "react";
import axios from "axios";
import api from "@/lib/axios";

export function useAuth() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const verifyAdmin = useCallback(async () => {
    try {
      const res = await api.get("/admin/me");
      const userData = res.data?.data;
      if (userData?.adminRoleId && userData?.adminRole) {
        localStorage.setItem("adminRoleId", userData.adminRoleId);
        localStorage.setItem("adminRole", JSON.stringify(userData.adminRole));
      }
      return true;
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axiosErr = err as { response?: { status?: number } };
        if (axiosErr.response?.status === 401) {
          setError("Session expired. Please log in again.");
        } else if (axiosErr.response?.status === 403) {
          setError("You do not have admin privileges");
        } else if (axiosErr.response?.status === 404) {
          setError("Admin profile not found");
        } else {
          setError("Unable to connect. Check your internet.");
        }
      } else {
        setError("Unable to connect. Check your internet.");
      }
      return false;
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      await axios.post("/api/auth/login", { email, password });

      const ok = await verifyAdmin();
      if (!ok) {
        clearAuthTokens();
      }
      return ok;
    } catch (err: unknown) {
      if (err && typeof err === "object") {
        const axiosErr = err as { response?: { data?: { message?: string } } };
        setError(axiosErr.response?.data?.message || "Invalid email or password");
      } else {
        setError("Unable to connect. Check your internet.");
      }
      return false;
    } finally {
      setLoading(false);
    }
  }, [verifyAdmin]);

  const loginWithGoogle = useCallback(async () => {
    setLoading(true);
    setError(null);
    window.location.href = "/api/auth/google";
    return false;
  }, []);

  const logout = useCallback(async () => {
    try {
      await axios.post("/api/auth/logout");
    } catch {
      // Ignore logout errors
    }
    clearAuthTokens();
    window.location.href = "/admin/login";
  }, []);

  const isAuthenticated = !!localStorage.getItem("adminRoleId");

  return { login, loginWithGoogle, logout, loading, error, isAuthenticated };
}

function clearAuthTokens() {
  localStorage.removeItem("adminRoleId");
  localStorage.removeItem("adminRole");
}
