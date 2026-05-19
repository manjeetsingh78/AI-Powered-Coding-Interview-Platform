import { Table } from "../ui";

export default function LeaderboardTable({ rows = [] }) {
  const columns = [
    { key: "rank", label: "Rank" },
    { key: "name", label: "Name" },
    { key: "score", label: "Score" },
    { key: "time", label: "Time" },
    { key: "language", label: "Language" },
  ];

  return <Table columns={columns} rows={rows} />;
}
