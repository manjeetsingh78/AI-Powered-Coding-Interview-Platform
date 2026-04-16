const API_BASE = "http://127.0.0.1:8000";

async function toJson(response) {
  try {
    return await response.json();
  } catch (error) {
    return { error: "Invalid server response." };
  }
}

export async function registerUser(payload) {
  const response = await fetch(`${API_BASE}/api/auth/signup/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return {
    ok: response.ok,
    status: response.status,
    data: await toJson(response),
  };
}

export async function loginUser(payload) {
  const response = await fetch(`${API_BASE}/api/auth/login/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    credentials: "include",
  });
  return {
    ok: response.ok,
    status: response.status,
    data: await toJson(response),
  };
}

export async function getMe() {
  const response = await fetch(`${API_BASE}/api/auth/me/`, {
    method: "GET",
    credentials: "include",
  });
  return {
    ok: response.ok,
    status: response.status,
    data: await toJson(response),
  };
}

export function getGoogleLoginUrl() {
  return `${API_BASE}/auth/login/google-oauth2/`;
}

export function getGithubLoginUrl() {
  return `${API_BASE}/auth/login/github/`;
}
