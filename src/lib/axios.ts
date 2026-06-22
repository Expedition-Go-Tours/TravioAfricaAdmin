import axios from "axios";
import { toast } from "sonner";

const api = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: () => void;
  reject: (error: unknown) => void;
}> = [];

function processQueue(error: unknown) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve();
    }
  });
  failedQueue = [];
}

function clearAuth() {
  localStorage.removeItem("adminRoleId");
  localStorage.removeItem("adminRole");
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response) {
      const { status } = error.response;
      const originalRequest = error.config;

      if (status === 401 && !originalRequest._retry && !originalRequest.url?.includes("/auth/refresh")) {
        if (isRefreshing) {
          return new Promise<void>((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          }).then(() => api(originalRequest));
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          await axios.post("/api/auth/refresh");

          processQueue(null);
          return api(originalRequest);
        } catch (refreshError) {
          processQueue(refreshError);
          clearAuth();
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

    return Promise.reject(error);
  },
);

export default api;
