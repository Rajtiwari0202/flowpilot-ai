import { Workflow, Mail, Clock3, CheckCircle2, Plus, ShieldCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Dashboard, WorkflowRow, ActivityRow, Page } from "./types";
import { ActivityCard, ActionButton } from "./SharedComponents";

interface DashboardPageProps {
  metrics: Dashboard["metrics"];
  workflows: WorkflowRow[];
  activity: ActivityRow[];
  setPage: (page: Page) => void;
}

export function DashboardPage({ metrics, workflows, activity, setPage }: DashboardPageProps) {
  const cards: Array<[string, string | number, LucideIcon]> = [
    ["Active automations", metrics.activeAutomations, Workflow],
    ["Leads processed", metrics.leadsProcessedToday, Mail],
    ["Pending approvals", metrics.pendingApprovals, Clock3],
    ["Success rate", `${metrics.successRate}%`, CheckCircle2],
  ];

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value, Icon]) => (
          <article className="panel p-4 bg-white dark:bg-[#0A0A0A] border-slate-200 dark:border-[#171717]" key={label}>
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-slate-500 dark:text-zinc-500">{label}</span>
              <Icon className="text-orange-600 dark:text-orange-500" size={17} />
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{value}</div>
          </article>
        ))}
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <ActivityCard rows={activity.slice(0, 5)} />
        <article className="panel p-5 bg-white dark:bg-[#0A0A0A] border-slate-200 dark:border-[#171717]">
          <h2 className="font-bold text-slate-900 dark:text-white">Quick actions</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-zinc-550">Move a real lead through the local MVP.</p>
          <div className="mt-5 space-y-2">
            <ActionButton icon={Plus} label="Capture a test lead" onClick={() => setPage("leads")} />
            <ActionButton icon={ShieldCheck} label={`Review approvals (${metrics.pendingApprovals})`} onClick={() => setPage("approvals")} />
            <ActionButton icon={Workflow} label={`Manage automations (${workflows.length})`} onClick={() => setPage("automations")} />
          </div>
        </article>
      </div>
    </>
  );
}
