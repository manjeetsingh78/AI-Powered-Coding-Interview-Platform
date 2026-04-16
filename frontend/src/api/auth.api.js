import client from "./client";

const toResult = (response) => ({
  ok: true,
  status: response.status,
  data: response.data,
});

const toErrorResult = (error) => ({
  ok: false,
  status: error?.response?.status || 500,
  data: error?.response?.data || { error: "Request failed." },
});

export async function register(payload) {
  try {
    const response = await client.post("/api/auth/signup/", payload);
    return toResult(response);
  } catch (error) {
    return toErrorResult(error);
  }
}

export async function login(payload) {
  try {
    const response = await client.post("/api/auth/login/", payload);
    return toResult(response);
  } catch (error) {
    return toErrorResult(error);
  }
}

export async function adminLogin(payload) {
  try {
    const response = await client.post("/api/auth/admin/login/", payload);
    return toResult(response);
  } catch (error) {
    return toErrorResult(error);
  }
}

export async function logout() {
  try {
    const response = await client.post("/api/auth/logout/");
    return toResult(response);
  } catch (error) {
    return toErrorResult(error);
  }
}

export async function me() {
  try {
    const response = await client.get("/api/auth/me/");
    return toResult(response);
  } catch (error) {
    return toErrorResult(error);
  }
}

export async function requestVerification(payload) {
  try {
    const response = await client.post("/api/auth/request-verification/", payload);
    return toResult(response);
  } catch (error) {
    return toErrorResult(error);
  }
}

export async function verifyAccount(payload) {
  try {
    const response = await client.post("/api/auth/verify-account/", payload);
    return toResult(response);
  } catch (error) {
    return toErrorResult(error);
  }
}

export async function requestPasswordReset(payload) {
  try {
    const response = await client.post("/api/auth/request-password-reset/", payload);
    return toResult(response);
  } catch (error) {
    return toErrorResult(error);
  }
}

export async function confirmPasswordReset(payload) {
  try {
    const response = await client.post("/api/auth/confirm-password-reset/", payload);
    return toResult(response);
  } catch (error) {
    return toErrorResult(error);
  }
}

export async function updateProfile(payload) {
  return {
    ok: false,
    status: 501,
    data: { error: "updateProfile not implemented yet.", payload },
  };
}
