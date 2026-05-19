import client from "./client";

const ok = (response) => ({ ok: true, status: response.status, data: response.data });
const fail = (error) => ({
  ok: false,
  status: error?.response?.status || 500,
  data: error?.response?.data || { error: "Request failed." },
});

export async function listAssessments(params = {}) {
  try {
    const response = await client.get("/api/workflows/tests/", { params });
    const drafts = response.data?.drafts || [];
    return {
      ok: true,
      status: response.status,
      data: {
        assessments: drafts,
      },
    };
  } catch (error) {
    return fail(error);
  }
}

export async function createAssessment(payload) {
  try {
    const response = await client.post("/api/workflows/tests/", {
      title: payload?.title,
      duration_minutes: payload?.duration_minutes,
      problem_ids: payload?.problem_ids || [],
    });
    return ok(response);
  } catch (error) {
    return fail(error);
  }
}

export async function inviteCandidate(payload) {
  return {
    ok: false,
    status: 501,
    data: {
      error: "Candidate invite endpoint is not available in the current backend.",
      payload,
    },
  };
}

export async function getAssessmentDetail(assessmentId) {
  try {
    const response = await client.get(`/api/workflows/tests/${assessmentId}/`);
    return {
      ok: true,
      status: response.status,
      data: {
        assessment: response.data?.draft,
      },
    };
  } catch (error) {
    return fail(error);
  }
}

export async function deleteAssessment(assessmentId) {
  try {
    const response = await client.delete(`/api/workflows/tests/${assessmentId}/`);
    return ok(response);
  } catch (error) {
    return fail(error);
  }
}
