import { useEffect, useState } from "react";

import { CODE_STARTERS } from "../../utils/constants";

export default function CodeEditor({ language, value, onChange }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!mounted && !value) {
      onChange?.(CODE_STARTERS[language] || "");
    }
    setMounted(true);
  }, [language, mounted, onChange, value]);

  return (
    <div className="editor-shell">
      <textarea rows={18} value={value} onChange={(event) => onChange?.(event.target.value)} />
    </div>
  );
}
