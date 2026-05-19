import { useState, useCallback, useEffect, useRef } from "react";

import { createProblemAdmin } from "../../api/problems.api";
import { Button, Spinner } from "../../components/ui";

/* ── helpers ─────────────────────────────────────────────── */

const STEPS = [
  { key: "basics", label: "Basic Info", icon: "📋" },
  { key: "content", label: "Description", icon: "📝" },
  { key: "examples", label: "Examples & Tests", icon: "🧪" },
  { key: "solutions", label: "Solutions", icon: "💡" },
  { key: "review", label: "Review", icon: "✅" },
];

const DIFFICULTY_OPTIONS = [
  { value: "easy", label: "Easy", color: "#10b981" },
  { value: "medium", label: "Medium", color: "#f59e0b" },
  { value: "hard", label: "Hard", color: "#ef4444" },
];

const LANGUAGES = [
  { key: "cpp", label: "C++", placeholder: "// C++ solution" },
  { key: "java", label: "Java", placeholder: "// Java solution" },
  { key: "python", label: "Python", placeholder: "# Python solution" },
  { key: "javascript", label: "JavaScript", placeholder: "// JavaScript solution" },
];

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "") || "problem";
}

function emptyExample(i) {
  return { input: "", output: "", explanation: "", order: i };
}

function emptyTestCase(i) {
  return { input_data: "", expected_output: "", is_sample: i === 0, is_hidden: i !== 0, order: i };
}

function initialForm() {
  return {
    title: "",
    slug: "",
    description: "",
    problem_statement: "",
    constraints_text: "",
    follow_up: "",
    difficulty: "easy",
    time_limit_ms: 1000,
    memory_limit_mb: 128,
    tags: [],
    tagInput: "",
    is_active: true,
    examples: [emptyExample(0)],
    test_cases: [emptyTestCase(0)],
    solutions: { cpp: "", java: "", python: "", javascript: "" },
  };
}

/* ── sub-components ─────────────────────────────────────── */

function StepIndicator({ steps, current, onStepClick, getStepStatus }) {
  return (
    <nav className="wizard-stepper" aria-label="Problem creation steps">
      {steps.map((step, i) => {
        let cls = "wizard-step";
        const status = getStepStatus?.(i);
        if (i === current) cls += " active";
        else if (status === "complete" || i < current) cls += " done";

        return (
          <button
            key={step.key}
            type="button"
            className={cls}
            disabled={i > current && status !== "complete"}
            onClick={() => onStepClick(i)}
            tabIndex={i > current ? -1 : 0}
            title={step.label}
          >
            <span className="wizard-step-badge">{status === "complete" || i < current ? "✓" : step.icon}</span>
            <span className="wizard-step-label">{step.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function FieldError({ message }) {
  if (!message) return null;
  return <span className="ui-field-error">{message}</span>;
}

function TagInput({ tags, inputValue, onAdd, onRemove, onInputChange }) {
  const inputRef = useRef(null);

  const handleKeyDown = (e) => {
    const val = inputValue.trim();
    if ((e.key === "Enter" || e.key === ",") && val) {
      e.preventDefault();
      onAdd(val);
    }
    if (e.key === "Backspace" && !inputValue && tags.length) {
      onRemove(tags[tags.length - 1]);
    }
  };

  const handleBlur = () => {
    const val = inputValue.trim();
    if (val) {
      onAdd(val);
    }
  };

  return (
    <div className="tag-input-wrapper" onClick={() => inputRef.current?.focus()}>
      {tags.map((tag) => (
        <span key={tag} className="tag-chip">
          {tag}
          <button type="button" className="tag-chip-remove" onClick={() => onRemove(tag)} aria-label={`Remove ${tag}`}>
            ×
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        type="text"
        className="tag-input-field"
        value={inputValue}
        onChange={(e) => onInputChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={tags.length ? "Add another..." : "Type tag and press Enter"}
      />
    </div>
  );
}

function CollapsibleSection({ title, defaultOpen = true, badge, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`collapsible ${open ? "open" : ""}`}>
      <button type="button" className="collapsible-trigger" onClick={() => setOpen(!open)}>
        <span className="collapsible-chevron">{open ? "▾" : "▸"}</span>
        <span>{title}</span>
        {badge != null ? <span className="collapsible-badge">{badge}</span> : null}
      </button>
      {open && <div className="collapsible-body">{children}</div>}
    </div>
  );
}

function ConfirmDialog({ open, title, message, onConfirm, onCancel, confirmLabel = "Discard", busy = false }) {
  if (!open) return null;
  return (
    <div className="ui-modal-backdrop" role="dialog" aria-modal="true">
      <div className="ui-modal" style={{ maxWidth: 420 }}>
        <header className="ui-modal-header">
          <h3>{title}</h3>
        </header>
        <div className="ui-modal-body">
          <p style={{ margin: "0 0 16px", color: "#475569", fontSize: 14 }}>{message}</p>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Button type="button" variant="secondary" onClick={onCancel} disabled={busy}>
              Keep Editing
            </Button>
            <Button type="button" variant="danger" onClick={onConfirm} disabled={busy} loading={busy}>
              {confirmLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── validation ──────────────────────────────────────────── */

function validateStep(step, form) {
  const errors = {};

  if (step === 0) {
    if (!form.title.trim()) errors.title = "Title is required.";
    if (form.time_limit_ms < 100 || form.time_limit_ms > 10000)
      errors.time_limit_ms = "Time limit must be between 100–10000 ms.";
    if (form.memory_limit_mb < 16 || form.memory_limit_mb > 4096)
      errors.memory_limit_mb = "Memory limit must be between 16–4096 MB.";
  }

  if (step === 1) {
    if (!form.description.trim() && !form.problem_statement.trim())
      errors.description = "At least one of Description or Problem Statement is required.";
  }

  if (step === 2) {
    const hasTestCase = form.test_cases.some(
      (tc) => tc.input_data.trim() || tc.expected_output.trim()
    );
    if (!hasTestCase) errors.test_cases = "At least one test case is required.";
  }

  return errors;
}

function getRequestErrorMessage(result, fallback) {
  const error = result?.data?.error || result?.data?.detail;
  if (typeof error === "string" && error.trim()) {
    return error;
  }
  if (result?.status) {
    return `${fallback} Server returned ${result.status}.`;
  }
  return fallback;
}

/* ── main component ─────────────────────────────────────── */

export default function ProblemForm({
  onSuccess,
  onCancel,
  submitLabel = "Publish Problem",
  cancelLabel = "Cancel",
  showCancel = true,
}) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [form, setForm] = useState(initialForm);
  const [dirty, setDirty] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const pendingNavigation = useRef(null);

  /* ── unsaved changes guard ──────────────────────────── */
  useEffect(() => {
    const handler = (e) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const safeNavigate = useCallback(
    (fn) => {
      if (dirty) {
        pendingNavigation.current = fn;
        setShowUnsavedDialog(true);
      } else {
        fn();
      }
    },
    [dirty],
  );

  /* ── field helpers ──────────────────────────────────── */
  const set = useCallback((key, value) => {
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
    setForm((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  }, []);

  const setNested = useCallback((key, updater) => {
    setForm((prev) => ({ ...prev, [key]: updater(prev[key]) }));
    setDirty(true);
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    set(name, type === "checkbox" ? checked : value);
  };

  /* ── slug auto-gen ──────────────────────────────────── */
  const handleTitleChange = (e) => {
    const title = e.target.value;
    set("title", title);
    if (!form.slug || form.slug === slugify(form.title)) {
      setForm((prev) => ({ ...prev, title, slug: slugify(title) }));
    } else {
      setForm((prev) => ({ ...prev, title }));
    }
  };

  /* ── tags ───────────────────────────────────────────── */
  const addTag = useCallback(
    (name) => {
      const normalized = name.trim().toLowerCase();
      if (!normalized) return;
      setForm((prev) => ({
        ...prev,
        tags: prev.tags.includes(normalized) ? prev.tags : [...prev.tags, normalized],
        tagInput: "",
      }));
      setDirty(true);
    },
    [],
  );

  const removeTag = useCallback((name) => {
    setForm((prev) => ({ ...prev, tags: prev.tags.filter((t) => t !== name) }));
    setDirty(true);
  }, []);

  /* ── examples ───────────────────────────────────────── */
  const exampleChange = (i, field, value) => {
    setNested("examples", (prev) =>
      prev.map((ex, idx) => (idx === i ? { ...ex, [field]: value } : ex)),
    );
  };

  const addExample = () => {
    setNested("examples", (prev) => [...prev, emptyExample(prev.length)]);
  };

  const removeExample = (i) => {
    setNested("examples", (prev) =>
      prev.length <= 1 ? prev : prev.filter((_, idx) => idx !== i),
    );
  };

  /* ── test cases ─────────────────────────────────────── */
  const testCaseChange = (i, field, value) => {
    setNested("test_cases", (prev) =>
      prev.map((tc, idx) => (idx === i ? { ...tc, [field]: value } : tc)),
    );
  };

  const addTestCase = () => {
    setNested("test_cases", (prev) => [...prev, emptyTestCase(prev.length)]);
  };

  const removeTestCase = (i) => {
    setNested("test_cases", (prev) =>
      prev.length <= 1 ? prev : prev.filter((_, idx) => idx !== i),
    );
  };

  const addBulkTestCases = (count) => {
    setNested("test_cases", (prev) => {
      const next = [...prev];
      for (let i = 0; i < count; i++) {
        next.push(emptyTestCase(next.length));
      }
      return next;
    });
  };

  /* ── solutions ──────────────────────────────────────── */
  const solutionChange = (lang, value) => {
    setNested("solutions", (prev) => ({ ...prev, [lang]: value }));
  };

  /* ── navigation ─────────────────────────────────────── */
  const goNext = () => {
    const errs = validateStep(step, form);
    if (Object.keys(errs).length) {
      setFieldErrors(errs);
      return;
    }
    setFieldErrors({});
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const goPrev = () => setStep((s) => Math.max(s - 1, 0));

  const handleCancel = () => safeNavigate(onCancel);

  /* ── submit ─────────────────────────────────────────── */
  const handleSubmit = async () => {
    setError("");
    setSuccess("");
    const submitErrors = validateStep(0, form);
    for (let i = 1; i < STEPS.length; i++) {
      const stepErrors = validateStep(i, form);
      Object.assign(submitErrors, stepErrors);
    }
    if (Object.keys(submitErrors).length) {
      setError("Please fix the validation errors before publishing.");
      setFieldErrors(submitErrors);
      setSaving(false);
      return;
    }
    setSaving(true);

    const payload = {
      title: form.title.trim(),
      slug: form.slug.trim(),
      description: form.description.trim(),
      problem_statement: form.problem_statement.trim(),
      constraints: form.constraints_text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean),
      follow_up: form.follow_up.trim(),
      difficulty: form.difficulty,
      time_limit_ms: Number(form.time_limit_ms),
      memory_limit_mb: Number(form.memory_limit_mb),
      is_active: Boolean(form.is_active),
      tags: form.tags,
      examples: form.examples
        .map((ex) => ({ input: ex.input.trim(), output: ex.output.trim(), explanation: ex.explanation.trim() }))
        .filter((ex) => ex.input || ex.output || ex.explanation),
      test_cases: form.test_cases.map((tc, i) => ({
        input_data: tc.input_data,
        expected_output: tc.expected_output,
        is_sample: Boolean(tc.is_sample),
        is_hidden: Boolean(tc.is_hidden),
        order: i,
      })),
      solutions: Object.entries(form.solutions)
        .map(([lang, code]) => ({ language: lang, code: String(code || "") }))
        .filter((s) => s.code.trim()),
    };

    const result = await createProblemAdmin(payload);
    setSaving(false);

    if (!result.ok) {
      setError(getRequestErrorMessage(result, "Unable to create problem."));
      setStep(0);
      return;
    }

    setSuccess("Problem published successfully.");
    setDirty(false);
    setForm(initialForm());
    setStep(0);

    if (onSuccess) {
      setTimeout(() => onSuccess(result.data?.problem), 600);
    }
  };

  /* ── keyboard shortcuts ─────────────────────────────── */
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === "TEXTAREA" || e.target.tagName === "INPUT") return;
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        if (step < STEPS.length - 1) goNext();
        else handleSubmit();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [step, form]);

  /* ── render helpers ─────────────────────────────────── */
  const field = (label, name, child, required) => (
    <div className="wizard-field" data-has-error={Boolean(fieldErrors[name])}>
      <label className="ui-field-label">
        {label} {required ? <span className="required-star">*</span> : null}
      </label>
      {child}
      <FieldError message={fieldErrors[name]} />
    </div>
  );

  const textarea = (label, name, rows = 5, placeholder = "") =>
    field(
      label,
      name,
      <textarea
        name={name}
        rows={rows}
        value={form[name]}
        onChange={handleChange}
        placeholder={placeholder}
        className="wizard-textarea"
      />,
    );

  const filledCount = (arr, key) => arr.filter((item) => item[key]?.trim()).length;

  /* ── step renderers ─────────────────────────────────── */
  const renderBasics = () => (
    <div className="wizard-step-body">
      <div className="wizard-row wizard-row-2col">
        {field(
          "Problem Title",
          "title",
          <input
            name="title"
            type="text"
            value={form.title}
            onChange={handleTitleChange}
            placeholder="e.g. Two Sum"
            className="wizard-input"
            autoFocus
          />,
          true,
        )}

        {field(
          "URL Slug",
          "slug",
          <input
            name="slug"
            type="text"
            value={form.slug}
            onChange={handleChange}
            placeholder="auto-generated"
            className="wizard-input wizard-input-mono"
          />,
        )}
      </div>

      <div className="wizard-row wizard-row-3col">
        {field(
          "Difficulty",
          "difficulty",
          <div className="difficulty-radio-group">
            {DIFFICULTY_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={`difficulty-chip ${form.difficulty === opt.value ? "selected" : ""}`}
                style={{ "--chip-color": opt.color }}
              >
                <input
                  type="radio"
                  name="difficulty"
                  value={opt.value}
                  checked={form.difficulty === opt.value}
                  onChange={handleChange}
                />
                {opt.label}
              </label>
            ))}
          </div>,
          true,
        )}

        {field(
          "Status",
          "is_active",
          <label className="toggle-switch">
            <input
              type="checkbox"
              name="is_active"
              checked={form.is_active}
              onChange={handleChange}
            />
            <span className="toggle-track" />
            <span className="toggle-label">{form.is_active ? "Active" : "Inactive"}</span>
          </label>,
        )}

        {field(
          "Tags",
          "tags",
          <TagInput
            tags={form.tags}
            inputValue={form.tagInput}
            onAdd={addTag}
            onRemove={removeTag}
            onInputChange={(v) => setForm((prev) => ({ ...prev, tagInput: v }))}
          />,
        )}
      </div>

      <div className="wizard-row wizard-row-2col">
        {field(
          "Time Limit (ms)",
          "time_limit_ms",
          <input
            name="time_limit_ms"
            type="number"
            min={100}
            max={10000}
            step={100}
            value={form.time_limit_ms}
            onChange={handleChange}
            className="wizard-input"
          />,
        )}

        {field(
          "Memory Limit (MB)",
          "memory_limit_mb",
          <input
            name="memory_limit_mb"
            type="number"
            min={16}
            max={4096}
            step={16}
            value={form.memory_limit_mb}
            onChange={handleChange}
            className="wizard-input"
          />,
        )}
      </div>
    </div>
  );

  const renderContent = () => (
    <div className="wizard-step-body">
      {textarea("Description", "description", 5, "Legacy full description (optional if Problem Statement is filled).")}
      {textarea("Problem Statement", "problem_statement", 7, "Write the core problem statement that candidates will see.")}
      {textarea("Constraints", "constraints_text", 4, "One per line:\n1 ≤ nums.length ≤ 10⁵\n-10⁹ ≤ nums[i] ≤ 10⁹")}
      {textarea("Follow-up Question", "follow_up", 3, 'e.g. "Can you solve it in O(n) time?"')}
    </div>
  );

  const renderExamplesAndTests = () => (
    <div className="wizard-step-body">
      <CollapsibleSection
        title="Examples"
        badge={`${filledCount(form.examples, "input")} / ${form.examples.length}`}
      >
        <div className="testcase-grid">
          {form.examples.map((ex, i) => (
            <div key={`ex-${i}`} className="testcase-card">
              <div className="testcase-card-header">
                <strong>Example #{i + 1}</strong>
                {form.examples.length > 1 && (
                  <button
                    type="button"
                    className="testcase-remove-btn"
                    onClick={() => removeExample(i)}
                    title="Remove this example"
                  >
                    ×
                  </button>
                )}
              </div>
              <div className="wizard-row wizard-row-2col">
                <label>
                  Input
                  <textarea
                    rows={3}
                    value={ex.input}
                    onChange={(e) => exampleChange(i, "input", e.target.value)}
                    placeholder='e.g. nums = [2,7,11,15], target = 9'
                  />
                </label>
                <label>
                  Output
                  <textarea
                    rows={3}
                    value={ex.output}
                    onChange={(e) => exampleChange(i, "output", e.target.value)}
                    placeholder='e.g. [0,1]'
                  />
                </label>
              </div>
              <label>
                Explanation
                <textarea
                  rows={2}
                  value={ex.explanation}
                  onChange={(e) => exampleChange(i, "explanation", e.target.value)}
                  placeholder="Explain why this output is correct (optional)."
                />
              </label>
            </div>
          ))}
        </div>
        <Button type="button" variant="secondary" onClick={addExample} style={{ marginTop: 8 }}>
          + Add Example
        </Button>
      </CollapsibleSection>

      <CollapsibleSection
        title="Test Cases"
        badge={`${filledCount(form.test_cases, "input_data")} / ${form.test_cases.length}`}
      >
        <FieldError message={fieldErrors.test_cases} />
        <div className="testcase-grid">
          {form.test_cases.map((tc, i) => (
            <div key={`tc-${i}`} className="testcase-card">
              <div className="testcase-card-header">
                <strong>Case #{i + 1}</strong>
                <div className="testcase-badges">
                  <label className={`testcase-chip ${tc.is_sample ? "sample" : ""}`}>
                    <input
                      type="checkbox"
                      checked={tc.is_sample}
                      onChange={(e) => testCaseChange(i, "is_sample", e.target.checked)}
                    />
                    Sample
                  </label>
                  <label className={`testcase-chip ${tc.is_hidden ? "hidden" : ""}`}>
                    <input
                      type="checkbox"
                      checked={tc.is_hidden}
                      onChange={(e) => testCaseChange(i, "is_hidden", e.target.checked)}
                    />
                    Hidden
                  </label>
                  {form.test_cases.length > 1 && (
                    <button
                      type="button"
                      className="testcase-remove-btn"
                      onClick={() => removeTestCase(i)}
                      title="Remove this test case"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
              <div className="wizard-row wizard-row-2col">
                <label>
                  Input
                  <textarea
                    rows={3}
                    value={tc.input_data}
                    onChange={(e) => testCaseChange(i, "input_data", e.target.value)}
                    placeholder="Raw input data"
                  />
                </label>
                <label>
                  Expected Output
                  <textarea
                    rows={3}
                    value={tc.expected_output}
                    onChange={(e) => testCaseChange(i, "expected_output", e.target.value)}
                    placeholder="Expected output"
                  />
                </label>
              </div>
            </div>
          ))}
        </div>
        <div className="testcase-actions">
          <Button type="button" variant="secondary" onClick={addTestCase}>
            + Add Test Case
          </Button>
          <Button type="button" variant="secondary" onClick={() => addBulkTestCases(5)}>
            + Add 5
          </Button>
        </div>
      </CollapsibleSection>
    </div>
  );

  const renderSolutions = () => (
    <div className="wizard-step-body">
      <p className="wizard-hint">Provide canonical solutions. Leave blank for languages you don&apos;t need.</p>
      {LANGUAGES.map((lang) => (
        <CollapsibleSection
          key={lang.key}
          title={lang.label}
          defaultOpen={!!form.solutions[lang.key]}
          badge={form.solutions[lang.key] ? "✓" : "—"}
        >
          <textarea
            rows={8}
            value={form.solutions[lang.key]}
            onChange={(e) => solutionChange(lang.key, e.target.value)}
            placeholder={lang.placeholder}
            className="wizard-textarea wizard-textarea-code"
          />
        </CollapsibleSection>
      ))}
    </div>
  );

  const renderReview = () => {
    const validation = [
      { label: "Title", ok: !!form.title.trim() },
      { label: "Difficulty", ok: true },
      { label: "Description or Problem Statement", ok: !!(form.description.trim() || form.problem_statement.trim()) },
      { label: "At least one test case", ok: form.test_cases.some((tc) => tc.input_data.trim() || tc.expected_output.trim()) },
      { label: "Examples", ok: form.examples.some((ex) => ex.input.trim() || ex.output.trim()) },
      { label: "Solutions", ok: Object.values(form.solutions).some((s) => s.trim().length > 0) },
    ];
    return (
    <div className="wizard-step-body">
      <div className="review-validation-summary" style={{ marginBottom: 18 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {validation.map((v) => (
            <span
              key={v.label}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 600,
                background: v.ok ? "#dcfce7" : "#fef3c7",
                color: v.ok ? "#166534" : "#92400e",
                border: `1px solid ${v.ok ? "#86efac" : "#fcd34d"}`,
              }}
            >
              {v.ok ? "✓" : "!"} {v.label}
            </span>
          ))}
        </div>
      </div>
      <div className="review-grid">
        <div className="review-section">
          <h4>Overview</h4>
          <dl>
            <dt>Title</dt>
            <dd>{form.title || <em>Untitled</em>}</dd>
            <dt>Slug</dt>
            <dd><code>{form.slug || "—"}</code></dd>
            <dt>Difficulty</dt>
            <dd><span className={`problem-difficulty ${form.difficulty}`}>{form.difficulty}</span></dd>
            <dt>Status</dt>
            <dd><span className={`problem-status-badge ${form.is_active ? "active" : "inactive"}`}>{form.is_active ? "Active" : "Inactive"}</span></dd>
            <dt>Time Limit</dt>
            <dd>{form.time_limit_ms} ms</dd>
            <dt>Memory Limit</dt>
            <dd>{form.memory_limit_mb} MB</dd>
          </dl>
        </div>

        <div className="review-section">
          <h4>Tags</h4>
          <div className="admin-chip-row">
            {form.tags.length ? form.tags.map((t) => <span key={t} className="admin-chip">{t}</span>) : <em>No tags</em>}
          </div>
        </div>

        <div className="review-section">
          <h4>Content</h4>
          <dl>
            <dt>Description</dt>
            <dd>{form.description ? `${form.description.slice(0, 120)}…` : <em>None</em>}</dd>
            <dt>Problem Statement</dt>
            <dd>{form.problem_statement ? `${form.problem_statement.slice(0, 120)}…` : <em>None</em>}</dd>
            <dt>Constraints</dt>
            <dd>{form.constraints_text ? `${form.constraints_text.split("\n").length} line(s)` : <em>None</em>}</dd>
            <dt>Follow-up</dt>
            <dd>{form.follow_up || <em>None</em>}</dd>
          </dl>
        </div>

        <div className="review-section">
          <h4>Examples ({filledCount(form.examples, "input")})</h4>
          {form.examples.filter((ex) => ex.input.trim() || ex.output.trim()).slice(0, 3).map((ex, i) => (
            <div key={i} className="review-snippet">
              <span className="review-snippet-label">#{i + 1}</span>
              <code>{ex.input.slice(0, 60)}{ex.input.length > 60 ? "…" : ""} → {ex.output.slice(0, 40)}{ex.output.length > 40 ? "…" : ""}</code>
            </div>
          ))}
        </div>

        <div className="review-section">
          <h4>Test Cases ({filledCount(form.test_cases, "input_data")})</h4>
          <p>
            {form.test_cases.filter((tc) => tc.is_sample).length} sample,{" "}
            {form.test_cases.filter((tc) => tc.is_hidden).length} hidden
          </p>
        </div>

        <div className="review-section">
          <h4>Solutions</h4>
          <div className="admin-chip-row">
            {LANGUAGES.filter((l) => form.solutions[l.key]).map((l) => (
              <span key={l.key} className="admin-chip">{l.label}</span>
            ))}
            {LANGUAGES.every((l) => !form.solutions[l.key]) && <em>No solutions provided</em>}
          </div>
        </div>
      </div>
    </div>
  );
  };

  const stepRenderers = [renderBasics, renderContent, renderExamplesAndTests, renderSolutions, renderReview];

  /* ── main render ─────────────────────────────────────── */
  const isLastStep = step === STEPS.length - 1;

  const getStepStatus = useCallback(
    (stepIndex) => {
      if (stepIndex === 0) {
        if (form.title.trim() && form.title.trim().length >= 3) return "complete";
        if (form.title.trim()) return "partial";
        return "empty";
      }
      if (stepIndex === 1) {
        if (form.problem_statement.trim() || form.description.trim()) return "complete";
        return "empty";
      }
      if (stepIndex === 2) {
        const validCases = form.test_cases.some((tc) => tc.input_data.trim() || tc.expected_output.trim());
        if (validCases) return "complete";
        return "empty";
      }
      if (stepIndex === 3) {
        const hasSolutions = Object.values(form.solutions).some((s) => s.trim().length > 0);
        return hasSolutions ? "complete" : "empty";
      }
      return "empty";
    },
    [form]
  );

  const progressPercent = Math.round(((step + 1) / STEPS.length) * 100);

  return (
    <div className="wizard-shell">
      {/* toast notifications */}
      {error && (
        <div className="wizard-toast wizard-toast-error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => setError("")} className="wizard-toast-close">×</button>
        </div>
      )}
      {success && (
        <div className="wizard-toast wizard-toast-success" role="status">
          <span>{success}</span>
          <button type="button" onClick={() => setSuccess("")} className="wizard-toast-close">×</button>
        </div>
      )}

      {/* progress bar */}
      <div className="wizard-progress" role="progressbar" aria-valuenow={progressPercent} aria-valuemin={0} aria-valuemax={100}>
        <div className="wizard-progress-fill" style={{ width: `${progressPercent}%` }} />
      </div>

      {/* stepper */}
      <StepIndicator steps={STEPS} current={step} onStepClick={(i) => setStep(i)} getStepStatus={getStepStatus} />

      {/* step content */}
      <div className="wizard-body" key={step}>
        {stepRenderers[step]()}
      </div>

      {/* sticky action bar */}
      <div className="wizard-actions">
        <div className="wizard-actions-left">
          {showCancel && (
            <Button type="button" variant="secondary" onClick={handleCancel} disabled={saving}>
              {cancelLabel}
            </Button>
          )}
        </div>
        <div className="wizard-actions-right">
          {step > 0 && (
            <Button type="button" variant="secondary" onClick={goPrev} disabled={saving}>
              ← Back
            </Button>
          )}
          {!isLastStep ? (
            <Button type="button" onClick={goNext}>
              Next →
            </Button>
          ) : (
            <Button type="button" onClick={handleSubmit} disabled={saving} loading={saving}>
              {saving ? "Publishing..." : submitLabel}
            </Button>
          )}
        </div>
      </div>

      {/* keyboard hint */}
      <div className="wizard-kbd-hint">
        {!isLastStep ? "Ctrl+Enter to go to next step" : "Ctrl+Enter to submit"}
      </div>

      {/* unsaved changes dialog */}
      <ConfirmDialog
        open={showUnsavedDialog}
        title="Unsaved Changes"
        message="You have unsaved changes. Are you sure you want to leave?"
        onConfirm={() => {
          setShowUnsavedDialog(false);
          setDirty(false);
          pendingNavigation.current?.();
        }}
        onCancel={() => setShowUnsavedDialog(false)}
        busy={saving}
      />
    </div>
  );
}
