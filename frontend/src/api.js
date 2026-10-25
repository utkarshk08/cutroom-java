import axios from "axios";

// This module is the only place that knows the Java server's address.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8081/api",
  timeout: 15000,
});

export function getSession() {
  try {
    return JSON.parse(sessionStorage.getItem("cutroom-learning-session")) || null;
  } catch {
    return null;
  }
}

export function saveSession(session) {
  if (session) sessionStorage.setItem("cutroom-learning-session", JSON.stringify(session));
  else sessionStorage.removeItem("cutroom-learning-session");
}

// A Bearer token is sent with each request; the backend verifies its signature.
api.interceptors.request.use((config) => {
  const session = getSession();
  if (session?.token) config.headers.Authorization = `Bearer ${session.token}`;
  return config;
});

export function errorMessage(error) {
  if (error.response?.status === 401)
    return "Please sign in again. Your email/password may be incorrect or your session expired.";
  if (!error.response)
    return "Cannot reach the Java API. Start MySQL and the backend on port 8081, then retry. Your open design is still here.";
  return error.response.data?.message || "The request could not be completed.";
}

export const register = (data) => api.post("/auth/register", data).then((result) => result.data);
export const login = (data) => api.post("/auth/login", data).then((result) => result.data);
export const listProjects = () => api.get("/projects").then((result) => result.data);
export const getProject = (id) => api.get(`/projects/${id}`).then((result) => result.data);
export const createProject = (data) => api.post("/projects", data).then((result) => result.data);
export const updateProject = (id, data) =>
  api.put(`/projects/${id}`, data).then((result) => result.data);
export const deleteProject = (id) => api.delete(`/projects/${id}`);
