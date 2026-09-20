import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { toast } from "sonner";
import { disconnectAdminSocket } from "@/lib/adminSocket";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
  // A dropped connection (e.g. a suspended background tab) must not hang
  // requests forever. Fail fast so React Query can retry idempotent calls.
  timeout: 30_000,
});

// ── Travio Africa Admin route rewriting ─────────────────────────────────
// Auth endpoints (/auth/*) and blog stay on the shared backend. Every other
// admin surface is rewritten to /travioafrica/admin/* so this dashboard only
// sees Africa-scoped data. The resource prefixes below MUST mirror
// TravioGhana-Admin's interceptor exactly — a missing rule silently falls
// through to the shared endpoint and leaks the other brand's data (this is
// what made Ghana reviews and suppliers appear here).
api.interceptors.request.use((config) => {
  const url = config.url || "";

  // /admin/* → /travioafrica/admin/*
  if (url.startsWith("/admin")) {
    config.url = "/travioafrica" + url;
    return config;
  }

  // /reviews/admin/* → /travioafrica/admin/reviews/*
  if (url.startsWith("/reviews/admin/")) {
    config.url = "/travioafrica/admin/reviews" + url.slice("/reviews/admin".length);
    return config;
  }
  if (url.match(/^\/reviews\/[^/]+\/(moderate|admin)/)) {
    config.url = "/travioafrica/admin/reviews" + url.slice("/reviews".length);
    return config;
  }

  // /suppliers/admin/* → /travioafrica/admin/suppliers/*
  if (url.startsWith("/suppliers/admin/")) {
    config.url = "/travioafrica/admin/suppliers" + url.slice("/suppliers/admin".length);
    return config;
  }

  // /payouts/admin/* → /travioafrica/admin/payouts/*
  if (url.startsWith("/payouts/admin")) {
    config.url = "/travioafrica/admin/payouts" + url.slice("/payouts/admin".length);
    return config;
  }

  // /payout-methods/admin/* → /travioafrica/admin/payout-methods/*
  if (url.startsWith("/payout-methods/admin")) {
    config.url = "/travioafrica/admin/payout-methods" + url.slice("/payout-methods/admin".length);
    return config;
  }

  // /notifications → /travioafrica/admin/notifications (Africa-scoped)
  if (url.startsWith("/notifications")) {
    config.url = "/travioafrica/admin" + url;
    return config;
  }

  // /chat/* → /travioafrica/admin/chat/* (Africa-scoped)
  if (url.startsWith("/chat")) {
    config.url = "/travioafrica/admin" + url;
    return config;
  }

  // /tours/* (non-admin) → /travioafrica/admin/tours/* (Africa tours only)
  // Exception: /tours/filters/options stays shared (filter metadata)
  if (url.startsWith("/tours/") && !url.startsWith("/tours/filters")) {
    config.url = "/travioafrica/admin/tours" + url.slice("/tours".length);
    return config;
  }

  // Blog + auth stay shared (cross-platform).
  return config;
});

// Augment AxiosRequestConfig so callers can opt in/out of the global error
// toast on a per-request basis.
declare module "axios" {
  export interface AxiosRequestConfig {
    skipGlobalErrorHandler?: boolean;
  }
}

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
  localStorage.removeItem("userName");
}

// Redirect to login without relying on React Router (called from the axios
// interceptor, which lives outside the component tree). Guard against
// redirect loops by only redirecting once per page load.
let didRedirectToLogin = false;
export function redirectToLogin() {
  if (didRedirectToLogin) return;
  didRedirectToLogin = true;
  disconnectAdminSocket();
  clearAuth();
  if (window.location.pathname !== "/admin/login") {
    window.location.assign("/admin/login");
  }
}

export function resetLoginRedirectGuard() {
  didRedirectToLogin = false;
}

// Whether a failing request should surface a global toast. We deliberately
// stay silent for background/read-only GETs (React Query already shows inline
// section errors) and for offline conditions (the browser is offline, not the
// server). Mutations and explicitly opted-in requests still toast.
function shouldShowToast(error: AxiosError): boolean {
  if (error.config?.skipGlobalErrorHandler) return false;
  if (typeof navigator !== "undefined" && navigator.onLine === false) return false;
  const method = (error.config?.method || "get").toLowerCase();
  return method !== "get";
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (axios.isCancel(error)) {
      return Promise.reject(error);
    }

    if (error.response) {
      const { status } = error.response;
      const originalRequest = error.config as
        | (InternalAxiosRequestConfig & { _retry?: boolean })
        | undefined;

      if (
        status === 401 &&
        originalRequest &&
        !originalRequest._retry &&
        !originalRequest.url?.includes("/auth/refresh") &&
        !originalRequest.url?.includes("/auth/login")
      ) {
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
          redirectToLogin();
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      }

      if (status >= 500 && shouldShowToast(error)) {
        showErrorToast("Server error. Try again.");
      }
    } else if (error.request && shouldShowToast(error)) {
      showErrorToast("Network error. Check connection.");
    }

    return Promise.reject(error);
  },
);

export default api;
