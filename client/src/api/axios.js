import axios from "axios";

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL
});

// Attach JWT token to every request automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
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
    if (error.response?.status === 401 && !isReleaseEndpoint) {
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
