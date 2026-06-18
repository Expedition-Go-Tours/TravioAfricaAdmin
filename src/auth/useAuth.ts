import { useState, useCallback } from "react";
import axios from "axios";
import api from "@/lib/axios";

const API_URL = import.meta.env.VITE_API_URL || "";

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
        if (axiosErr.response?.status === 403) {
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
      const { data } = await axios.post(`${API_URL}/auth/login`, { email, password });
      const { accessToken, refreshToken, user } = data.data;

      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("refreshToken", refreshToken);
      localStorage.setItem("userRole", user.roles?.includes("admin") ? "admin" : "user");

      const ok = await verifyAdmin();
      if (!ok) {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("userRole");
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
    if (!API_URL) {
      setError("API URL not configured. Check your .env file.");
      setLoading(false);
      return false;
    }
    window.location.href = `${API_URL}/auth/google`;
    return false;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // Ignore logout errors
    }
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("userRole");
    localStorage.removeItem("adminRoleId");
    localStorage.removeItem("adminRole");
    window.location.href = "/admin/login";
  }, []);

  const isAuthenticated = !!localStorage.getItem("accessToken") && localStorage.getItem("userRole") === "admin";

  return { login, loginWithGoogle, logout, loading, error, isAuthenticated };
}
