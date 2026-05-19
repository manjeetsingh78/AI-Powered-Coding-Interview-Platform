import { Button } from "../ui";

export default function RunButton({ loading, onClick }) {
  return (
    <Button variant="primary" loading={loading} onClick={onClick}>
      {loading ? "Running..." : "Run & Submit"}
    </Button>
  );
}
