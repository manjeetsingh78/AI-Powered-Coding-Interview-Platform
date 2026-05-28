import axios from "axios";
import Cookies from "js-cookie";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

const client = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach CSRF token from cookie when present
client.interceptors.request.use((config) => {
  const csrfToken = Cookies.get("csrftoken");
  if (csrfToken) {
    config.headers = config.headers || {};
    config.headers["X-CSRFToken"] = csrfToken;
  }
  return config;
});

// Response interceptor to attempt refresh on 401 once
client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (!originalRequest || !error?.response) return Promise.reject(error);

    // Only try once per request
    if (error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        // Call refresh endpoint with full URL to avoid interceptor recursion
        await axios.post(`${API_BASE}/api/auth/refresh/`, null, { withCredentials: true });
        return client(originalRequest);
      } catch (e) {
        // Clear local auth state on failure
        localStorage.removeItem("auth_tokens");
        localStorage.removeItem("auth_user");
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export default client;
