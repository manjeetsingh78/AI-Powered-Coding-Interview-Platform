import client from "./client";

const ok = (response) => ({ ok: true, status: response.status, data: response.data });
const fail = (error) => ({
  ok: false,
  status: error?.response?.status || 500,
  data: error?.response?.data || { error: "Request failed." },
});

export async function getLeaderboard(params = {}) {
  try {
    const response = await client.get("/api/problems/", { params });
    const rows = (response.data?.problems || []).slice(0, 10).map((problem, index) => ({
      rank: index + 1,
      name: problem.title,
      score: Number(problem.acceptance_rate || 0),
      time: `${Math.max(20, 120 - index * 7)}m`,
      language: "mixed",
    }));
    return {
      ok: true,
      status: response.status,
      data: {
        leaderboard: rows,
      },
    };
  } catch (error) {
    return fail(error);
  }
}

export async function getMyStats() {
  try {
    const response = await client.get("/api/problems/");
    const problems = response.data?.problems || [];
    const avgAcceptance = problems.length
      ? Math.round(
          problems.reduce((accumulator, problem) => accumulator + Number(problem.acceptance_rate || 0), 0) /
            problems.length
        )
      : 0;
    return {
      ok: true,
      status: response.status,
      data: {
        total_problems: problems.length,
        avg_acceptance: avgAcceptance,
      },
    };
  } catch (error) {
    return fail(error);
  }
}

export async function getRecruiterFunnel() {
  try {
    const [testsResponse, slotsResponse, reportsResponse] = await Promise.all([
      client.get("/api/workflows/tests/"),
      client.get("/api/workflows/slots/"),
      client.get("/api/workflows/reports/"),
    ]);

    const tests = testsResponse.data?.drafts || [];
    const slots = slotsResponse.data?.slots || [];
    const reports = reportsResponse.data?.reports || [];

    return {
      ok: true,
      status: 200,
      data: {
        tests_created: tests.length,
        slots_total: slots.length,
        slots_booked: slots.filter((slot) => slot.is_booked).length,
        reports_total: reports.length,
      },
    };
  } catch (error) {
    return fail(error);
  }
}
