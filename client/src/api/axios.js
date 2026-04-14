import axios from "axios";

const api = axios.create({
  baseURL: (process.env.REACT_APP_API_URL || "http://localhost:9000").replace(/\/$/, ""),
  withCredentials: true
});

// Attach JWT token to every request automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  config.headers = config.headers || {};
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses — clear auth state and redirect to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isReleaseEndpoint = error.config?.url?.includes("/release/");
    const message = String(error.response?.data?.message || "").toLowerCase();
    const isPasswordValidationEndpoint =
      error.config?.url?.includes("/api/user/account") ||
      error.config?.url?.includes("/api/user/change-password");
    const isPasswordValidationError =
      isPasswordValidationEndpoint &&
      (message.includes("incorrect password") || message.includes("current password is incorrect"));

    if (error.response?.status === 401 && !isReleaseEndpoint && !isPasswordValidationError) {
      localStorage.removeItem("token");
      localStorage.removeItem("termsAccepted");
      localStorage.removeItem("onboardingCompleted");
      localStorage.removeItem("fullName");
      window.location.href = "/";
    }
    return Promise.reject(error);
  }
);

export default api;
