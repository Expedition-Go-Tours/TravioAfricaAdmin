import { useState, useCallback, useEffect } from "react";
import api from "@/lib/axios";

export function useAuth() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) setLoading(false);
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  const verifyAdmin = useCallback(async () => {
    try {
      const res = await api.get("/admin/me");
      const userData = res.data?.data;
      if (userData?.adminRoleId && userData?.adminRole) {
        localStorage.setItem("adminRoleId", userData.adminRoleId);
        localStorage.setItem("adminRole", JSON.stringify(userData.adminRole));
        localStorage.setItem("userName", userData.name || "");
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
      await api.post("/auth/login", { email, password });

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
    try {
      const base = import.meta.env.VITE_API_URL || "/api";
      window.location.href = `${base}/auth/google`;
    } catch {
      setLoading(false);
    }
    return false;
  }, []);

  const loginWithGoogleOneTap = useCallback(async (credential: string) => {
    setLoading(true);
    setError(null);
    try {
      await api.post("/auth/google/onetap", { credential });

      const ok = await verifyAdmin();
      if (!ok) {
        clearAuthTokens();
      }
      return ok;
    } catch (err: unknown) {
      if (err && typeof err === "object") {
        const axiosErr = err as { response?: { data?: { message?: string } } };
        setError(axiosErr.response?.data?.message || "Google sign-in failed");
      } else {
        setError("Unable to connect. Check your internet.");
      }
      return false;
    } finally {
      setLoading(false);
    }
  }, [verifyAdmin]);

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // Ignore logout errors
    }
    clearAuthTokens();
    window.location.href = "/admin/login";
  }, []);

  const isAuthenticated = !!localStorage.getItem("adminRoleId");

  return { login, loginWithGoogle, loginWithGoogleOneTap, logout, loading, error, isAuthenticated };
}

function clearAuthTokens() {
  localStorage.removeItem("adminRoleId");
  localStorage.removeItem("adminRole");
}
