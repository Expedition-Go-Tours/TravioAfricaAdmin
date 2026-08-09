import axios from "axios";
import { toast } from "sonner";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: () => void;
  reject: (error: unknown) => void;
}> = [];

// Error toasts must never stack: an outage (paused DB, gateway 5xx, dropped
// connection) fails every background refetch, and each failure would otherwise
// pop its own toast. Same-message toasts are suppressed within the window, so
// the user sees one notice per problem, not a wall of identical ones.
const ERROR_TOAST_DEDUPE_MS = 20000;
let lastErrorToast = { message: "", at: 0 };

function showErrorToast(message: string) {
  const now = Date.now();
  if (lastErrorToast.message === message && now - lastErrorToast.at < ERROR_TOAST_DEDUPE_MS) {
    return;
  }
  lastErrorToast = { message, at: now };
  toast.error(message);
}

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
    if (axios.isCancel(error)) {
      return Promise.reject(error);
    }

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
          await api.post("/auth/refresh");

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

      if (status >= 500) {
        showErrorToast("Server error. Try again.");
      }
    } else if (error.request) {
      showErrorToast("Network error. Check connection.");
    }

    return Promise.reject(error);
  },
);

export default api;
