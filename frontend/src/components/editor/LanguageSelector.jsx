import { Select } from "../ui";
import { LANGUAGES } from "../../utils/constants";

export default function LanguageSelector({ value, onChange }) {
  return (
    <Select
      label="Language"
      value={value}
      onChange={(event) => onChange?.(event.target.value)}
      options={LANGUAGES}
    />
  );
}
