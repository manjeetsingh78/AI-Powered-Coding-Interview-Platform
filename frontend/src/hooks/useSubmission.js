import { useCallback, useState } from "react";

import { getSubmissionResult, submitCode } from "../api/submissions.api";

export default function useSubmission() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const runSubmission = useCallback(async (payload) => {
    setLoading(true);
    setResult(null);

    const submitResult = await submitCode(payload);
    if (!submitResult.ok) {
      setLoading(false);
      setResult(submitResult.data);
      return submitResult;
    }

    const submissionId = submitResult.data?.submission_id || submitResult.data?.id;
    if (!submissionId) {
      setLoading(false);
      setResult(submitResult.data);
      return submitResult;
    }

    const finalResult = await getSubmissionResult(submissionId);
    setLoading(false);
    setResult(finalResult.data);
    return finalResult;
  }, []);

  return {
    loading,
    result,
    runSubmission,
    clearResult: () => setResult(null),
  };
}
