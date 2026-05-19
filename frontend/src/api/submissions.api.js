import client from "./client";

const ok = (response) => ({ ok: true, status: response.status, data: response.data });
const fail = (error) => ({
  ok: false,
  status: error?.response?.status || 500,
  data: error?.response?.data || { error: "Request failed." },
});

export async function submitCode(payload) {
  try {
    const response = await client.post("/api/submissions/submit/", payload);
    return ok(response);
  } catch (error) {
    return fail(error);
  }
}

export async function getSubmissionResult(submissionId) {
  try {
    const response = await client.get(`/api/submissions/results/${submissionId}/`);
    return ok(response);
  } catch (error) {
    return fail(error);
  }
}

export async function listSubmissionHistory(params = {}) {
  try {
    const response = await client.get("/api/submissions/history/", { params });
    return ok(response);
  } catch (error) {
    return fail(error);
  }
}
