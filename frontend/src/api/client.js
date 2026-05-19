import axios from "axios";

const client = axios.create({
  baseURL: "/",
  withCredentials: true,
});

client.interceptors.request.use((config) => {
  return config;
});

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (!originalRequest || error?.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      await axios.post("/api/auth/refresh/", null, { withCredentials: true });
      return client(originalRequest);
    } catch {
      localStorage.removeItem("auth_tokens");
      localStorage.removeItem("auth_user");
    }

    return Promise.reject(error);
  }
);

export default client;
