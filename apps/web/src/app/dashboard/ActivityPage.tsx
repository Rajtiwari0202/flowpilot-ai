import { ActivityRow } from "./types";
import { ActivityCard } from "./SharedComponents";

interface ActivityPageProps {
  rows: ActivityRow[];
}

export function ActivityPage({ rows }: ActivityPageProps) {
  return <ActivityCard rows={rows} />;
}
