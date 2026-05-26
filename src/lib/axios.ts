import axios from "axios";
import { toast } from "sonner";

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

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const { status } = error.response;
      if (status === 401) {
        localStorage.removeItem("firebaseToken");
        localStorage.removeItem("userRole");
        window.location.href = "/admin/login";
      } else if (status === 403) {
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
