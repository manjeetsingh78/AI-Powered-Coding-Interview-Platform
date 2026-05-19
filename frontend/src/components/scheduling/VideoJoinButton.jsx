import { Button } from "../ui";

export default function VideoJoinButton({ url }) {
  if (!url) return null;

  return (
    <Button variant="primary" onClick={() => window.open(url, "_blank", "noopener,noreferrer") }>
      Join Video Interview
    </Button>
  );
}
