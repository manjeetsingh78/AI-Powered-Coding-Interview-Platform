import client from "./client";

function toResult(response) {
  return {
    ok: response.status >= 200 && response.status < 300,
    status: response.status,
    data: response.data,
  };
}

function toErrorResult(error) {
  if (error?.response) {
    return {
      ok: false,
      status: error.response.status,
      data: error.response.data,
    };
  }
  return {
    ok: false,
    status: 0,
    data: { error: "Network error" },
  };
}

export async function listProblemsAdmin() {
  try {
    const response = await client.get("/api/problems/");
    return toResult(response);
  } catch (error) {
    return toErrorResult(error);
  }
}

export async function createProblemAdmin(payload) {
  try {
    const response = await client.post("/api/problems/admin/", payload);
    return toResult(response);
  } catch (error) {
    return toErrorResult(error);
  }
}

export async function listProblems(params = {}) {
  try {
    const response = await client.get("/api/problems/", { params });
    return toResult(response);
  } catch (error) {
    return toErrorResult(error);
  }
}

export async function getProblemDetail(slug) {
  try {
    const response = await client.get(`/api/problems/${slug}/`);
    return toResult(response);
  } catch (error) {
    return toErrorResult(error);
  }
}
