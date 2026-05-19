import { Badge } from "../ui";

const map = {
  hire: "success",
  maybe: "warning",
  "no-hire": "danger",
};

export default function VerdictBadge({ verdict = "maybe" }) {
  const normalized = String(verdict).toLowerCase();
  return <Badge variant={map[normalized] || "neutral"}>{verdict}</Badge>;
}
