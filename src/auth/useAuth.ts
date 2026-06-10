import { useState, useCallback } from "react";
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth } from "@/lib/firebase";
import api from "@/lib/axios";

interface AdminRoleData {
  id: string;
  name: string;
  permissions: string[];
}

async function fetchAdminRole() {
  try {
    const res = await api.get("/admin/me");
    const userData = res.data?.data;
    if (userData?.adminRoleId) {
      localStorage.setItem("adminRoleId", userData.adminRoleId);
    }
    const rolesRes = await api.get("/admin/roles");
    const roles: AdminRoleData[] = rolesRes.data?.data || [];
    const match = roles.find((r) => r.id === userData?.adminRoleId);
    if (match) {
      localStorage.setItem("adminRole", JSON.stringify(match));
    }
  } catch {
    // non-critical
  }
}

export function useAuth() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const verifyAdmin = useCallback(async (token: string) => {
    try {
      await api.get("/admin/analytics/overview", {
        headers: { Authorization: `Bearer ${token}` },
      });
      return true;
    } catch (overviewErr: unknown) {
      if (overviewErr && typeof overviewErr === "object" && "response" in overviewErr) {
        const axiosErr = overviewErr as { response?: { status?: number } };
        if (axiosErr.response?.status === 403) {
          setError("You do not have admin privileges");
        } else {
          setError("Unable to connect. Check your internet.");
        }
      } else {
        setError("Unable to connect. Check your internet.");
      }
      return false;
    }
  }, []);

  const postLogin = useCallback(async (token: string) => {
    localStorage.setItem("firebaseToken", token);
    localStorage.setItem("userRole", "admin");
    await fetchAdminRole();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const token = await userCredential.user.getIdToken();

      const ok = await verifyAdmin(token);
      if (ok) {
        await postLogin(token);
      }
      return ok;
    } catch (firebaseErr: unknown) {
      if (firebaseErr && typeof firebaseErr === "object") {
        const err = firebaseErr as { code?: string };
        if (err.code === "auth/user-not-found" || err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
          setError("Invalid email or password");
        } else if (err.code === "auth/too-many-requests") {
          setError("Too many attempts. Try again later.");
        } else {
          setError("Unable to connect. Check your internet.");
        }
      } else {
        setError("Unable to connect. Check your internet.");
      }
      return false;
    } finally {
      setLoading(false);
    }
  }, [verifyAdmin, postLogin]);

  const loginWithGoogle = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const token = await userCredential.user.getIdToken();

      const ok = await verifyAdmin(token);
      if (ok) {
        await postLogin(token);
      }
      return ok;
    } catch (firebaseErr: unknown) {
      if (firebaseErr && typeof firebaseErr === "object") {
        const err = firebaseErr as { code?: string };
        if (err.code === "auth/popup-closed-by-user") {
          setError(null);
        } else if (err.code === "auth/popup-blocked") {
          setError("Popup blocked. Allow popups for this site.");
        } else {
          setError("Unable to connect. Check your internet.");
        }
      } else {
        setError("Unable to connect. Check your internet.");
      }
      return false;
    } finally {
      setLoading(false);
    }
  }, [verifyAdmin, postLogin]);

  const logout = useCallback(() => {
    localStorage.removeItem("firebaseToken");
    localStorage.removeItem("userRole");
    localStorage.removeItem("adminRoleId");
    localStorage.removeItem("adminRole");
    auth.signOut();
    window.location.href = "/admin/login";
  }, []);

  const isAuthenticated = !!localStorage.getItem("firebaseToken") && localStorage.getItem("userRole") === "admin";

  return { login, loginWithGoogle, logout, loading, error, isAuthenticated };
}
