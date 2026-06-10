import axios from "axios";
import { toast } from "sonner";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("firebaseToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token as string);
    }
  });
  failedQueue = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response) {
      const { status } = error.response;
      const originalRequest = error.config;

      if (status === 401 && !originalRequest._retry) {
        if (isRefreshing) {
          return new Promise<string>((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          }).then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          });
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          const user = auth.currentUser;
          if (!user) throw new Error("No authenticated user");
          const newToken = await user.getIdToken(true);
          localStorage.setItem("firebaseToken", newToken);
          processQueue(null, newToken);
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        } catch (refreshError) {
          processQueue(refreshError, null);
          localStorage.removeItem("firebaseToken");
          localStorage.removeItem("userRole");
          localStorage.removeItem("adminRoleId");
          localStorage.removeItem("adminRole");
          window.location.href = "/admin/login";
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      }

      if (status === 403) {
        toast.error("Access denied");
      } else if (status >= 500) {
        toast.error("Server error. Try again.");
      }
    } else if (error.request) {
      toast.error("Network error. Check connection.");
    }

    if (error.response?.status === 401 && window.location.pathname !== "/admin/login") {
      localStorage.removeItem("firebaseToken");
      localStorage.removeItem("userRole");
      localStorage.removeItem("adminRoleId");
      localStorage.removeItem("adminRole");
      window.location.href = "/admin/login";
    }

    return Promise.reject(error);
  },
);

let wasAuthenticated = false;
onAuthStateChanged(auth, (user) => {
  if (user) {
    wasAuthenticated = true;
  } else if (wasAuthenticated) {
    wasAuthenticated = false;
    localStorage.removeItem("firebaseToken");
    localStorage.removeItem("userRole");
    localStorage.removeItem("adminRoleId");
    localStorage.removeItem("adminRole");
    window.location.href = "/admin/login";
  }
});

export default api;
