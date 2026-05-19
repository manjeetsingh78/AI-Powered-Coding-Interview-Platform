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

export async function listTestDrafts() {
  try {
    const response = await client.get("/api/workflows/tests/");
    return toResult(response);
  } catch (error) {
    return toErrorResult(error);
  }
}

export async function createTestDraft(payload) {
  try {
    const response = await client.post("/api/workflows/tests/", payload);
    return toResult(response);
  } catch (error) {
    return toErrorResult(error);
  }
}

export async function deleteTestDraft(draftId) {
  try {
    const response = await client.delete(`/api/workflows/tests/${draftId}/`);
    return toResult(response);
  } catch (error) {
    return toErrorResult(error);
  }
}

export async function listSlots() {
  try {
    const response = await client.get("/api/workflows/slots/");
    return toResult(response);
  } catch (error) {
    return toErrorResult(error);
  }
}

export async function createSlot(payload) {
  try {
    const response = await client.post("/api/workflows/slots/", payload);
    return toResult(response);
  } catch (error) {
    return toErrorResult(error);
  }
}

export async function deleteSlot(slotId) {
  try {
    const response = await client.delete(`/api/workflows/slots/${slotId}/`);
    return toResult(response);
  } catch (error) {
    return toErrorResult(error);
  }
}

export async function bookSlot(slotId) {
  try {
    const response = await client.post(`/api/workflows/slots/${slotId}/book/`);
    return toResult(response);
  } catch (error) {
    return toErrorResult(error);
  }
}

export async function cancelSlot(slotId) {
  try {
    const response = await client.post(`/api/workflows/slots/${slotId}/cancel/`);
    return toResult(response);
  } catch (error) {
    return toErrorResult(error);
  }
}

export async function listCandidateReports() {
  try {
    const response = await client.get("/api/workflows/reports/");
    return toResult(response);
  } catch (error) {
    return toErrorResult(error);
  }
}

export async function saveCandidateReport(payload) {
  try {
    const response = await client.post("/api/workflows/reports/", payload);
    return toResult(response);
  } catch (error) {
    return toErrorResult(error);
  }
}
