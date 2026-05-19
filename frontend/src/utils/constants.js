export const LANGUAGES = [
  { label: "JavaScript", value: "javascript" },
  { label: "Python", value: "python" },
  { label: "Java", value: "java" },
  { label: "C++", value: "cpp" },
  { label: "Go", value: "go" },
];

export const CODE_STARTERS = {
  javascript: "const fs = require('fs');\nconst input = fs.readFileSync(0, 'utf8').trim();\n\nfunction solve(input) {\n  return input;\n}\n\nconsole.log(solve(input));",
  python: "import sys\n\ninput_data = sys.stdin.read().strip()\n\ndef solve(input_data):\n    return input_data\n\nprint(solve(input_data))",
  java: "import java.io.*;\n\nclass Main {\n  static String solve(String input) {\n    return input;\n  }\n\n  public static void main(String[] args) throws Exception {\n    String input = new String(System.in.readAllBytes()).trim();\n    System.out.print(solve(input));\n  }\n}",
  cpp: "#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n  ios::sync_with_stdio(false);\n  cin.tie(nullptr);\n\n  string input((istreambuf_iterator<char>(cin)), istreambuf_iterator<char>());\n  while (!input.empty() && (input.back() == '\\n' || input.back() == '\\r' || input.back() == ' ')) input.pop_back();\n  cout << input;\n  return 0;\n}",
  go: "package main\n\nimport (\n  \"fmt\"\n  \"io\"\n  \"os\"\n  \"strings\"\n)\n\nfunc solve(input string) string {\n  return input\n}\n\nfunc main() {\n  data, _ := io.ReadAll(os.Stdin)\n  fmt.Print(solve(strings.TrimSpace(string(data))))\n}",
};

export const DIFFICULTY_COLORS = {
  easy: "success",
  medium: "warning",
  hard: "danger",
};

export const STATUS_COLORS = {
  accepted: "success",
  pending: "warning",
  rejected: "danger",
};
