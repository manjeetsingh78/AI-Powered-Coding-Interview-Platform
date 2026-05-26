import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { getProblemDetail, listProblems } from "../../api/problems.api";
import { listSubmissionHistory } from "../../api/submissions.api";
import "../../assets/styles/app-shell.css";
import CodeEditor from "../../components/editor/CodeEditor";
import LanguageSelector from "../../components/editor/LanguageSelector";
import OutputPanel from "../../components/editor/OutputPanel";
import RunButton from "../../components/editor/RunButton";
import { Button, EmptyState, Spinner } from "../../components/ui";
import useSubmission from "../../hooks/useSubmission";
import { LANGUAGES } from "../../utils/constants";

function isEditableTarget(target) {
  if (!target) return false;
  const tag = String(target.tagName || "").toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select" || Boolean(target.isContentEditable);
}

function normalizeProblemContent(problemDetail) {
  const content = problemDetail?.content || {};
  const examples = Array.isArray(content.examples) ? content.examples : [];
  const constraints = Array.isArray(content.constraints) ? content.constraints : [];

  return {
    statement: String(content.statement || problemDetail?.problem_statement || problemDetail?.description || "").trim(),
    examples: examples
      .map((example, index) => ({
        id: Number(example?.id || index + 1),
        input: String(example?.input || "").trim(),
        output: String(example?.output || "").trim(),
        explanation: String(example?.explanation || "").trim(),
      }))
      .filter((example) => example.input || example.output || example.explanation),
    constraints: constraints.map((item) => String(item).trim()).filter(Boolean),
    followUp: String(content.follow_up || problemDetail?.follow_up || "").trim(),
  };
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatLeetCodeText(value) {
  if (value == null || String(value).trim() === "") {
    return "";
  }
  const escaped = escapeHtml(value)
    .replace(/-231\s*<=/g, "-2^31 <=")
    .replace(/<=\s*231\s*-\s*1/g, "<= 2^31 - 1")
    .replace(/231\s*-\s*1/g, "2^31 - 1");

  return escaped.replace(/(\d+)\^(\d+)/g, (_, base, exponent) => `${base}<sup>${exponent}</sup>`);
}

function makeCustomCase(id) {
  return {
    id,
    input_data: "",
    expected_output: "",
  };
}

export default function CandidateProblemPage() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [problems, setProblems] = useState([]);
  const [problemDetail, setProblemDetail] = useState(null);
  const [language, setLanguage] = useState("javascript");
  const [code, setCode] = useState("");
  const [activeLeftTab, setActiveLeftTab] = useState("description");
  const customCaseCounterRef = useRef(1);
  const [customCases, setCustomCases] = useState([makeCustomCase("custom-1")]);
  const [activeCustomCaseId, setActiveCustomCaseId] = useState("");
  const customCaseTabsRef = useRef(null);
  const descriptionSectionRef = useRef(null);
  const editorialSectionRef = useRef(null);
  const codeSectionRef = useRef(null);
  const submissionsSectionRef = useRef(null);
  const [submissionRows, setSubmissionRows] = useState([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const { loading: running, result, runSubmission } = useSubmission();

  const loadSubmissions = useCallback(async () => {
    setLoadingSubmissions(true);
    const result = await listSubmissionHistory({ problem_slug: slug });
    if (result.ok) {
      const normalizedRows = (result.data?.submissions || []).slice(0, 8).map((item, index) => ({
        id: item.id || `${index}`,
        status: item.status || "Submitted",
        score: Number(item.score || 0),
        language: item.language || language,
        submitted_at: item.submitted_at ? new Date(item.submitted_at).toLocaleString() : "-",
      }));
      setSubmissionRows(normalizedRows);
    }
    setLoadingSubmissions(false);
  }, [language, slug]);

  useEffect(() => {
    const load = async () => {
      setLoadingList(true);
      const response = await listProblems();
      if (response.ok) {
        setProblems(response.data?.problems || []);
      }
      setLoadingList(false);
    };

    load();
  }, []);

  useEffect(() => {
    if (!slug) return;

    const loadDetail = async () => {
      setLoadingDetail(true);
      const response = await getProblemDetail(slug);
      if (response.ok) {
        setProblemDetail(response.data?.problem || null);
      } else {
        setProblemDetail(null);
      }
      setLoadingDetail(false);
    };

    loadDetail();
  }, [slug]);

  useEffect(() => {
    if (!problemDetail?.test_cases?.length) return;
    setCustomCases((prev) => {
      if (prev.some((item) => item.input_data.trim() || item.expected_output.trim())) {
        return prev;
      }

      const firstSample = problemDetail.test_cases[0];
      return [
        {
          id: prev[0]?.id || "custom-1",
          input_data: firstSample?.input_data || "",
          expected_output: firstSample?.expected_output || "",
        },
      ];
    });
  }, [problemDetail]);

  useEffect(() => {
    if (!customCases.length) {
      setActiveCustomCaseId("");
      return;
    }

    if (!activeCustomCaseId || !customCases.some((item) => item.id === activeCustomCaseId)) {
      setActiveCustomCaseId(customCases[0].id);
    }
  }, [activeCustomCaseId, customCases]);

  useEffect(() => {
    if (!activeCustomCaseId) return;
    const container = customCaseTabsRef.current;
    if (!container) return;

    const activeButton = container.querySelector(`[data-case-id="${activeCustomCaseId}"]`);
    if (!activeButton) return;

    activeButton.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "nearest",
    });
  }, [activeCustomCaseId, customCases.length]);

  useEffect(() => {
    localStorage.setItem(
      "solve_workspace_state",
      JSON.stringify({
        selectedSlug: slug,
        language,
        codeLength: code.length,
      })
    );
  }, [code.length, language, slug]);

  useEffect(() => {
    loadSubmissions();
  }, [loadSubmissions]);

  useEffect(() => {
    if (result?.id || result?.submission_id) {
      loadSubmissions();
    }
  }, [loadSubmissions, result?.id, result?.submission_id]);

  useEffect(() => {
    const onSolveTab = (event) => {
      const tab = String(event.detail?.tab || "description");
      setActiveLeftTab(tab);
      window.dispatchEvent(new CustomEvent("solve:active-tab", { detail: { tab } }));
    };

    window.addEventListener("solve:tab", onSolveTab);
    return () => window.removeEventListener("solve:tab", onSolveTab);
  }, []);

  const currentProblemIndex = useMemo(
    () => problems.findIndex((problem) => problem.slug === slug),
    [problems, slug]
  );

  const onNextProblem = () => {
    if (!problems.length) return;
    const nextIndex = currentProblemIndex < 0 ? 0 : (currentProblemIndex + 1) % problems.length;
    const nextProblem = problems[nextIndex];
    if (nextProblem?.slug) {
      navigate(`/candidate/solve/${nextProblem.slug}`);
    }
  };

  const parsedProblem = useMemo(() => normalizeProblemContent(problemDetail), [problemDetail]);
  const derivedConstraints = useMemo(() => {
    return parsedProblem.constraints.length
      ? parsedProblem.constraints
      : ["Refer to the problem statement for input and output limits."];
  }, [parsedProblem.constraints]);

  const displayExamples = useMemo(() => {
    if (parsedProblem.examples.length) return parsedProblem.examples;

    return (problemDetail?.test_cases || []).slice(0, 3).map((testCase, index) => ({
      id: index + 1,
      input: testCase.input_data,
      output: testCase.expected_output,
      explanation: "",
    }));
  }, [parsedProblem.examples, problemDetail?.test_cases]);

  const activeCustomCase = useMemo(
    () => customCases.find((item) => item.id === activeCustomCaseId) || customCases[0] || null,
    [activeCustomCaseId, customCases]
  );

  const updateCustomCase = (id, field, value) => {
    setCustomCases((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  };

  const createCustomCase = () => {
    customCaseCounterRef.current += 1;
    return makeCustomCase(`custom-${customCaseCounterRef.current}`);
  };

  const addCustomCase = () => {
    const nextCase = createCustomCase();
    setCustomCases((prev) => [...prev, nextCase]);
    setActiveCustomCaseId(nextCase.id);
  };

  const removeCustomCase = (id) => {
    setCustomCases((prev) => {
      const removedIndex = prev.findIndex((item) => item.id === id);
      const next = prev.filter((item) => item.id !== id);
      if (next.length) {
        if (id === activeCustomCaseId) {
          const preferredIndex = Math.max(0, removedIndex - 1);
          const fallbackIndex = Math.min(preferredIndex, next.length - 1);
          setActiveCustomCaseId(next[fallbackIndex].id);
        }
        return next;
      }

      const fallbackCase = createCustomCase();
      setActiveCustomCaseId(fallbackCase.id);
      return [fallbackCase];
    });
  };

  const onCustomCaseTabKeyDown = (event, id) => {
    const currentIndex = customCases.findIndex((item) => item.id === id);
    if (currentIndex < 0) return;

    if (event.key === "ArrowRight") {
      event.preventDefault();
      const nextIndex = (currentIndex + 1) % customCases.length;
      setActiveCustomCaseId(customCases[nextIndex].id);
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      const nextIndex = (currentIndex - 1 + customCases.length) % customCases.length;
      setActiveCustomCaseId(customCases[nextIndex].id);
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      setActiveCustomCaseId(customCases[0].id);
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      setActiveCustomCaseId(customCases[customCases.length - 1].id);
      return;
    }

    if ((event.key === "Delete" || event.key === "Backspace") && customCases.length > 1) {
      event.preventDefault();
      removeCustomCase(id);
    }
  };

  const runCustomCases = () => {
    const payloadCases = customCases
      .map((item) => ({
        input_data: item.input_data,
        expected_output: item.expected_output,
      }))
      .filter((item) => item.input_data.trim() || item.expected_output.trim());

    if (!payloadCases.length) return;

    runSubmission({
      problem_slug: slug,
      language,
      code,
      run_mode: "custom",
      custom_test_cases: payloadCases,
    });
  };

  const submitCurrentCode = () => {
    if (!slug) return;
    runSubmission({
      problem_slug: slug,
      language,
      code,
    });
  };

  useEffect(() => {
    const onRun = () => {
      if (!slug) return;
      runSubmission({ problem_slug: slug, language, code });
    };

    const onNextLanguage = () => {
      const currentIndex = LANGUAGES.findIndex((item) => item.value === language);
      const next = LANGUAGES[(currentIndex + 1) % LANGUAGES.length]?.value || "javascript";
      setLanguage(next);
    };

    window.addEventListener("palette:solve:run", onRun);
    window.addEventListener("palette:solve:next-language", onNextLanguage);
    window.addEventListener("palette:solve:next-problem", onNextProblem);

    return () => {
      window.removeEventListener("palette:solve:run", onRun);
      window.removeEventListener("palette:solve:next-language", onNextLanguage);
      window.removeEventListener("palette:solve:next-problem", onNextProblem);
    };
  }, [code, language, onNextProblem, runSubmission, slug]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        if (!slug) return;
        runSubmission({ problem_slug: slug, language, code });
        return;
      }

      if (!event.altKey) return;
      if (isEditableTarget(event.target)) return;

      if (event.key.toLowerCase() === "l") {
        event.preventDefault();
        const currentIndex = LANGUAGES.findIndex((item) => item.value === language);
        const next = LANGUAGES[(currentIndex + 1) % LANGUAGES.length]?.value || "javascript";
        setLanguage(next);
      }

      if (event.key.toLowerCase() === "n") {
        event.preventDefault();
        onNextProblem();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [code, language, onNextProblem, runSubmission, slug]);

  const leftTabs = [
    { key: "description", label: "Description" },
    { key: "editorial", label: "Editorial" },
    { key: "solutions", label: "Solutions" },
    { key: "submissions", label: "Submissions" },
  ];

  return (
    <div className="leetcode-workspace">
      <header className="leetcode-topbar">
        <div className="leetcode-titlebar">
          <Button type="button" variant="secondary" onClick={() => navigate("/candidate/solve")}>
            Back
          </Button>
          <strong>Daily Question</strong>
          <Button type="button" variant="secondary" onClick={onNextProblem} disabled={!problems.length}>
            Next
          </Button>
        </div>
        <div className="leetcode-actions">
          <LanguageSelector value={language} onChange={setLanguage} />
          <Button type="button" variant="secondary" disabled={running} onClick={runCustomCases}>
            Run
          </Button>
          <RunButton loading={running} onClick={submitCurrentCode} />
        </div>
      </header>

      <main className="leetcode-grid">
        <section className="leetcode-pane leetcode-left-pane">
          <nav className="leetcode-tabs" aria-label="Problem tabs">
            {leftTabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={`leetcode-tab ${activeLeftTab === tab.key ? "active" : ""}`}
                onClick={() => setActiveLeftTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          <div className="leetcode-pane-scroll">
            {loadingDetail ? <Spinner /> : null}
            {!loadingDetail && !problemDetail ? (
              <EmptyState title="Problem not found" description="Select a valid problem from the queue." />
            ) : null}

            {!loadingDetail && problemDetail && activeLeftTab === "description" ? (
              <article className="leetcode-description">
                <h1>{problemDetail.title}</h1>
                <div className="leetcode-chip-row">
                  <span className={`leetcode-chip ${problemDetail.difficulty}`}>{problemDetail.difficulty}</span>
                  <span className="leetcode-chip">{problemDetail.time_limit_ms}ms</span>
                  <span className="leetcode-chip">{problemDetail.memory_limit_mb}MB</span>
                  {problemDetail.tags?.map((tag) => (
                    <span key={tag} className="leetcode-chip">{tag}</span>
                  ))}
                </div>

                <section className="leetcode-section">
                  {formatLeetCodeText(parsedProblem.statement || problemDetail.description || problemDetail?.problem_statement) ? (
                    <p dangerouslySetInnerHTML={{ __html: formatLeetCodeText(parsedProblem.statement || problemDetail.description || problemDetail?.problem_statement) }} />
                  ) : (
                    <EmptyState
                      title="No problem statement available"
                      description="The admin has not yet provided a problem statement."
                    />
                  )}
                </section>

                <section className="leetcode-section">
                  {displayExamples.length ? (
                    displayExamples.map((example) => (
                      <div key={example.id} className="leetcode-example">
                        <strong>Example {example.id}:</strong>
                        <pre><b>Input:</b> {example.input}</pre>
                        <pre><b>Output:</b> {example.output}</pre>
                        {example.explanation ? <pre><b>Explanation:</b> {example.explanation}</pre> : null}
                      </div>
                    ))
                  ) : (
                    <EmptyState title="No examples available" description="Examples were not configured for this problem yet." />
                  )}
                </section>

                <section className="leetcode-section">
                  <h3>Constraints:</h3>
                  <ul>
                    {derivedConstraints.map((item, index) => (
                      <li key={`${item}-${index}`} dangerouslySetInnerHTML={{ __html: formatLeetCodeText(item) }} />
                    ))}
                  </ul>
                </section>
              </article>
            ) : null}

            {!loadingDetail && problemDetail && activeLeftTab === "editorial" ? (
              <article className="leetcode-empty-tab">
                <h2>Editorial</h2>
                <p>No editorial is published yet for this problem.</p>
              </article>
            ) : null}

            {!loadingDetail && problemDetail && activeLeftTab === "solutions" ? (
              <article className="leetcode-empty-tab">
                <h2>Solutions</h2>
                <p>Reference solutions will appear here after the admin publishes them for candidates.</p>
              </article>
            ) : null}

            {!loadingDetail && problemDetail && activeLeftTab === "submissions" ? (
              <article className="leetcode-submissions-tab">
                <div className="leetcode-submission-head">
                  <span>Status</span>
                  <span>Language</span>
                  <span>Score</span>
                  <span>Submitted</span>
                </div>
                {loadingSubmissions ? <Spinner /> : null}
                {!loadingSubmissions && submissionRows.map((row) => (
                  <div key={row.id} className="leetcode-submission-row">
                    <span className={`leetcode-status ${String(row.status).toLowerCase().replace(/\s+/g, "-")}`}>
                      {row.status}
                    </span>
                    <span>{row.language}</span>
                    <span>{row.score}</span>
                    <span>{row.submitted_at}</span>
                  </div>
                ))}
                {!loadingSubmissions && !submissionRows.length ? (
                  <EmptyState title="No submissions yet" description="Run or submit code to populate this list." />
                ) : null}
              </article>
            ) : null}
          </div>
        </section>

        <section className="leetcode-right-stack">
          <article className="leetcode-pane leetcode-code-pane">
            <div className="leetcode-pane-head">
              <strong>Code</strong>
              <span>{language}</span>
            </div>
            <div className="leetcode-code-editor">
              <CodeEditor language={language} value={code} onChange={setCode} />
            </div>
          </article>

          <article className="leetcode-pane leetcode-test-pane">
            <div className="leetcode-bottom-tabs">
              <span className="active">Testcase</span>
              <span>Test Result</span>
            </div>

            <div className="leetcode-test-scroll">
              <div className="solve-custom-case-tabs-shell">
                <div className="solve-custom-case-tabs" role="tablist" aria-label="Custom test case tabs" ref={customCaseTabsRef}>
                  {customCases.map((testCase, index) => (
                    <div key={testCase.id} className={`solve-custom-case-tab-item ${activeCustomCaseId === testCase.id ? "active" : ""}`}>
                      <button
                        id={`custom-tab-${testCase.id}`}
                        type="button"
                        role="tab"
                        aria-selected={activeCustomCaseId === testCase.id}
                        aria-controls={`custom-panel-${testCase.id}`}
                        data-case-id={testCase.id}
                        className={`solve-custom-case-tab ${activeCustomCaseId === testCase.id ? "active" : ""}`}
                        onClick={() => setActiveCustomCaseId(testCase.id)}
                        onKeyDown={(event) => onCustomCaseTabKeyDown(event, testCase.id)}
                      >
                        Case {index + 1}
                      </button>
                      {customCases.length > 1 ? (
                        <button type="button" className="solve-custom-case-close" onClick={() => removeCustomCase(testCase.id)}>
                          x
                        </button>
                      ) : null}
                    </div>
                  ))}
                </div>
                <Button type="button" variant="secondary" onClick={addCustomCase} className="solve-custom-case-add" aria-label="Add custom test case">
                  +
                </Button>
              </div>

              {activeCustomCase ? (
                <article id={`custom-panel-${activeCustomCase.id}`} role="tabpanel" className="leetcode-custom-case">
                  <label>
                    Input
                    <textarea
                      rows={3}
                      value={activeCustomCase.input_data}
                      onChange={(event) => updateCustomCase(activeCustomCase.id, "input_data", event.target.value)}
                    />
                  </label>
                  <label>
                    Expected Output
                    <textarea
                      rows={2}
                      value={activeCustomCase.expected_output}
                      onChange={(event) => updateCustomCase(activeCustomCase.id, "expected_output", event.target.value)}
                    />
                  </label>
                </article>
              ) : null}

              <OutputPanel result={result} />
              {loadingList ? <p className="solve-meta-text">Syncing problem queue...</p> : null}
            </div>
          </article>
        </section>
      </main>
    </div>
  );
}
