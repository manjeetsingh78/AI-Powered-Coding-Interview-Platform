import client from "./client";

const toResult = (response) => ({
  ok: response.status >= 200 && response.status < 300,
  status: response.status,
  data: response.data,
});

const toErrorResult = (error) => ({
  ok: false,
  status: error?.response?.status || 500,
  data: error?.response?.data || { error: "Request failed." },
});

export async function listAdminUsers(params = {}) {
  try {
    const response = await client.get("/api/auth/admin/users/", { params });
    return toResult(response);
  } catch (error) {
    return toErrorResult(error);
  }
}

export async function createAdminUser(payload) {
  try {
    const response = await client.post("/api/auth/admin/users/", payload);
    return toResult(response);
  } catch (error) {
    return toErrorResult(error);
  }
}

export async function updateAdminUser(userId, payload) {
  try {
    const response = await client.patch(`/api/auth/admin/users/${userId}/`, payload);
    return toResult(response);
  } catch (error) {
    return toErrorResult(error);
  }
}

export async function deleteAdminUser(userId) {
  try {
    const response = await client.delete(`/api/auth/admin/users/${userId}/`);
    return toResult(response);
  } catch (error) {
    return toErrorResult(error);
  }
}

export async function listAdminCompanies(params = {}) {
  try {
    const response = await client.get("/api/auth/admin/companies/", { params });
    return toResult(response);
  } catch (error) {
    return toErrorResult(error);
  }
}

export async function createAdminCompany(payload) {
  try {
    const response = await client.post("/api/auth/admin/companies/", payload);
    return toResult(response);
  } catch (error) {
    return toErrorResult(error);
  }
}

export async function updateAdminCompany(companyId, payload) {
  try {
    const response = await client.patch(`/api/auth/admin/companies/${companyId}/`, payload);
    return toResult(response);
  } catch (error) {
    return toErrorResult(error);
  }
}

export async function deleteAdminCompany(companyId) {
  try {
    const response = await client.delete(`/api/auth/admin/companies/${companyId}/`);
    return toResult(response);
  } catch (error) {
    return toErrorResult(error);
  }
}
