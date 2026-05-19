import json
import os
import shutil
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request
from pathlib import Path

from django.conf import settings

from apps.submissions.models import Submission


class ExecutionServiceError(Exception):
    """Raised when the configured code execution service cannot run safely."""


class ExecutionBackendUnavailable(ExecutionServiceError):
    """Raised when no enterprise-safe executor is configured."""


class ExecutionResultPayload(dict):
    """Small typed marker for normalized executor responses."""


PISTON_LANGUAGE_MAP = {
    Submission.LANGUAGE_PYTHON: ("python", "PISTON_PYTHON_VERSION"),
    Submission.LANGUAGE_JAVASCRIPT: ("javascript", "PISTON_JAVASCRIPT_VERSION"),
    Submission.LANGUAGE_CPP: ("cpp", "PISTON_CPP_VERSION"),
    Submission.LANGUAGE_JAVA: ("java", "PISTON_JAVA_VERSION"),
    Submission.LANGUAGE_GO: ("go", "PISTON_GO_VERSION"),
}


def _normalize_result(returncode, stdout="", stderr="", elapsed_ms=0, timed_out=False, compile_error=False):
    return ExecutionResultPayload(
        returncode=returncode,
        stdout=stdout or "",
        stderr=stderr or "",
        elapsed_ms=max(0, int(elapsed_ms or 0)),
        timed_out=bool(timed_out),
        compile_error=bool(compile_error),
    )


def execute_code(language, code, input_data, timeout_seconds):
    backend = str(getattr(settings, "CODE_EXECUTION_BACKEND", "disabled") or "disabled").strip().lower()
    if backend == "piston":
        return _execute_with_piston(language, code, input_data, timeout_seconds)
    if backend == "local":
        if not getattr(settings, "ALLOW_LOCAL_CODE_EXECUTION", False):
            raise ExecutionBackendUnavailable("Local code execution is disabled.")
        return _execute_locally(language, code, input_data, timeout_seconds)
    raise ExecutionBackendUnavailable(
        "Code execution backend is not configured. Set CODE_EXECUTION_BACKEND to piston or local."
    )


def _execute_with_piston(language, code, input_data, timeout_seconds):
    api_url = str(getattr(settings, "PISTON_API_URL", "") or "").rstrip("/")
    if not api_url:
        raise ExecutionBackendUnavailable("PISTON_API_URL is required when CODE_EXECUTION_BACKEND=piston.")

    piston_language, version_env = PISTON_LANGUAGE_MAP.get(language, (None, None))
    piston_version = os.getenv(version_env, "") if version_env else ""
    if not piston_language or not piston_version:
        raise ExecutionBackendUnavailable(f"Piston runtime version is not configured for {language}.")

    payload = {
        "language": piston_language,
        "version": piston_version,
        "files": [{"name": _source_filename(language), "content": code}],
        "stdin": str(input_data or ""),
        "run_timeout": int(timeout_seconds * 1000),
        "compile_timeout": int(timeout_seconds * 1000),
    }
    request = urllib.request.Request(
        f"{api_url}/api/v2/execute",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    start = time.monotonic()
    try:
        with urllib.request.urlopen(request, timeout=max(2, timeout_seconds + 2)) as response:
            data = json.loads(response.read().decode("utf-8"))
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
        raise ExecutionServiceError(f"Execution service request failed: {exc}") from exc

    elapsed = max(1, int((time.monotonic() - start) * 1000))
    compile_block = data.get("compile") or {}
    run_block = data.get("run") or {}
    compile_stderr = compile_block.get("stderr") or ""
    run_stderr = run_block.get("stderr") or ""
    run_code = run_block.get("code")
    compile_code = compile_block.get("code")
    timed_out = "timeout" in str(run_block.get("signal") or "").lower()

    return _normalize_result(
        returncode=run_code if run_code is not None else compile_code or 0,
        stdout=run_block.get("stdout") or "",
        stderr=compile_stderr or run_stderr,
        elapsed_ms=elapsed,
        timed_out=timed_out,
        compile_error=bool(compile_stderr or (compile_code not in (None, 0))),
    )


def _source_filename(language):
    return {
        Submission.LANGUAGE_PYTHON: "main.py",
        Submission.LANGUAGE_JAVASCRIPT: "main.js",
        Submission.LANGUAGE_CPP: "main.cpp",
        Submission.LANGUAGE_JAVA: "Main.java",
        Submission.LANGUAGE_GO: "main.go",
    }.get(language, "main.txt")


def _run_subprocess(command, input_data, timeout_seconds, cwd):
    start = time.monotonic()
    try:
        completed = subprocess.run(
            command,
            input=str(input_data or ""),
            text=True,
            capture_output=True,
            timeout=timeout_seconds,
            cwd=cwd,
        )
        elapsed = max(1, int((time.monotonic() - start) * 1000))
        return _normalize_result(completed.returncode, completed.stdout, completed.stderr, elapsed)
    except subprocess.TimeoutExpired as exc:
        elapsed = max(1, int((time.monotonic() - start) * 1000))
        return _normalize_result(-1, exc.stdout or "", "Execution timed out.", elapsed, timed_out=True)


def _execute_locally(language, code, input_data, timeout_seconds):
    if language == Submission.LANGUAGE_PYTHON:
        return _execute_python(code, input_data, timeout_seconds)
    if language == Submission.LANGUAGE_JAVASCRIPT:
        return _execute_javascript(code, input_data, timeout_seconds)
    if language == Submission.LANGUAGE_CPP:
        return _execute_cpp(code, input_data, timeout_seconds)
    if language == Submission.LANGUAGE_JAVA:
        return _execute_java(code, input_data, timeout_seconds)
    if language == Submission.LANGUAGE_GO:
        return _execute_go(code, input_data, timeout_seconds)
    return _normalize_result(127, stderr=f"Unsupported language: {language}")


def _execute_python(code, input_data, timeout_seconds):
    with tempfile.TemporaryDirectory(prefix="submission_py_") as temp_dir:
        file_path = Path(temp_dir) / "main.py"
        file_path.write_text(code, encoding="utf-8")
        return _run_subprocess([sys.executable, str(file_path)], input_data, timeout_seconds, temp_dir)


def _execute_javascript(code, input_data, timeout_seconds):
    if not shutil.which("node"):
        return _normalize_result(127, stderr="Node.js is not installed on this server.")
    with tempfile.TemporaryDirectory(prefix="submission_js_") as temp_dir:
        file_path = Path(temp_dir) / "main.js"
        file_path.write_text(code, encoding="utf-8")
        return _run_subprocess(["node", str(file_path)], input_data, timeout_seconds, temp_dir)


def _execute_cpp(code, input_data, timeout_seconds):
    if not shutil.which("g++"):
        return _normalize_result(127, stderr="g++ is not installed on this server.")
    with tempfile.TemporaryDirectory(prefix="submission_cpp_") as temp_dir:
        source_path = Path(temp_dir) / "main.cpp"
        exe_path = Path(temp_dir) / "main.exe"
        source_path.write_text(code, encoding="utf-8")
        compile_result = _run_subprocess(["g++", str(source_path), "-O2", "-std=c++17", "-o", str(exe_path)], "", timeout_seconds, temp_dir)
        if compile_result["returncode"] != 0:
            compile_result["compile_error"] = True
            return compile_result
        return _run_subprocess([str(exe_path)], input_data, timeout_seconds, temp_dir)


def _execute_java(code, input_data, timeout_seconds):
    if not shutil.which("javac") or not shutil.which("java"):
        return _normalize_result(127, stderr="Java JDK is not installed on this server.")
    with tempfile.TemporaryDirectory(prefix="submission_java_") as temp_dir:
        source_path = Path(temp_dir) / "Main.java"
        source_path.write_text(code, encoding="utf-8")
        compile_result = _run_subprocess(["javac", str(source_path)], "", timeout_seconds, temp_dir)
        if compile_result["returncode"] != 0:
            compile_result["compile_error"] = True
            return compile_result
        return _run_subprocess(["java", "-cp", temp_dir, "Main"], input_data, timeout_seconds, temp_dir)


def _execute_go(code, input_data, timeout_seconds):
    if not shutil.which("go"):
        return _normalize_result(127, stderr="Go is not installed on this server.")
    with tempfile.TemporaryDirectory(prefix="submission_go_") as temp_dir:
        source_path = Path(temp_dir) / "main.go"
        source_path.write_text(code, encoding="utf-8")
        return _run_subprocess(["go", "run", str(source_path)], input_data, timeout_seconds, temp_dir)
