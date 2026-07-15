import { Pause, Play } from "lucide-react";
import { WorkflowRow } from "./types";
import { Empty } from "@/components/AuthComponents";

interface AutomationsPageProps {
  workflows: WorkflowRow[];
  mutate: (path: string, options: RequestInit, success: string) => Promise<void>;
}

export function AutomationsPage({ workflows, mutate }: AutomationsPageProps) {
  return (
    <div className="space-y-3">
      {workflows.length ? (
        workflows.map((row) => (
          <article className="panel flex items-center justify-between p-5 bg-white dark:bg-[#0A0A0A] border-slate-200 dark:border-[#171717]" key={row.id}>
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white">{row.name}</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-zinc-550">
                {row.runs} completed runs - {row.status}
              </p>
            </div>
            <button
              className="secondary-button"
              onClick={() =>
                mutate(
                  `/api/workflows/${row.id}`,
                  {
                    method: "PATCH",
                    body: JSON.stringify({ status: row.status === "active" ? "paused" : "active" }),
                  },
                  `Automation ${row.status === "active" ? "paused" : "resumed"}.`
                )
              }
              type="button"
            >
              {row.status === "active" ? <Pause size={15} /> : <Play size={15} />}
              {row.status === "active" ? "Pause" : "Resume"}
            </button>
          </article>
        ))
      ) : (
        <Empty text="No automations yet. Activate a template to begin." />
      )}
    </div>
  );
}
