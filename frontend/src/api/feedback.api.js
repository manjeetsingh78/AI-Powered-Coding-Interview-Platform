import client from "./client";

const ok = (response) => ({ ok: true, status: response.status, data: response.data });
const fail = (error) => ({
  ok: false,
  status: error?.response?.status || 500,
  data: error?.response?.data || { error: "Request failed." },
});

export async function getAIFeedback(submissionId) {
  try {
    const response = await client.get("/api/workflows/reports/");
    const report = (response.data?.reports || [])[0];
    if (!report) {
      return {
        ok: true,
        status: response.status,
        data: {
          feedback: {
            verdict: "maybe",
            quality_score: 0,
            similarity: 0,
            summary: "No feedback reports available yet.",
            strengths: [],
          },
        },
      };
    }
    return {
      ok: true,
      status: response.status,
      data: {
        feedback: {
          verdict: report.verdict || "maybe",
          quality_score: Number(report.score || 0),
          similarity: Math.max(0, 100 - Number(report.score || 0)),
          summary: report.notes || "Feedback generated from recruiter report notes.",
          strengths: report.notes ? [report.notes] : [],
          source_submission_id: submissionId,
        },
      },
    };
  } catch (error) {
    return fail(error);
  }
}

export async function getPlagiarismReport(submissionId) {
  return {
    ok: false,
    status: 501,
    data: {
      error: "Plagiarism endpoint is not available in the current backend.",
      submission_id: submissionId,
    },
  };
}
