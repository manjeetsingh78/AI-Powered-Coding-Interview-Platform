import client from "./client";

const ok = (response) => ({ ok: true, status: response.status, data: response.data });
const fail = (error) => ({
  ok: false,
  status: error?.response?.status || 500,
  data: error?.response?.data || { error: "Request failed." },
});

export async function listSlots(params = {}) {
  try {
    const response = await client.get("/api/workflows/slots/", { params });
    return ok(response);
  } catch (error) {
    return fail(error);
  }
}

export async function listInterviews() {
  try {
    const response = await client.get("/api/workflows/slots/");
    const interviews = (response.data?.slots || []).filter((slot) => slot.is_booked);
    return {
      ok: true,
      status: response.status,
      data: {
        interviews,
      },
    };
  } catch (error) {
    return fail(error);
  }
}

export async function bookSlot(slotId) {
  try {
    const response = await client.post(`/api/workflows/slots/${slotId}/book/`);
    return ok(response);
  } catch (error) {
    return fail(error);
  }
}

export async function cancelSlot(slotId) {
  try {
    const response = await client.post(`/api/workflows/slots/${slotId}/cancel/`);
    return ok(response);
  } catch (error) {
    return fail(error);
  }
}
