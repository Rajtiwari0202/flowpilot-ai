import { LucideIcon, Settings } from "lucide-react";
import { Badge } from "@/components/AuthComponents";
import { ActivityRow } from "./types";

export function ActivityCard({ rows }: { rows: ActivityRow[] }) {
  return (
    <article className="panel p-5 bg-white dark:bg-[#0A0A0A] border-slate-200 dark:border-[#171717]">
      <h2 className="font-bold text-slate-900 dark:text-white">Recent activity</h2>
      <div className="mt-4 space-y-3">
        {rows.length ? (
          rows.map((row) => (
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#171717] pb-3 text-sm" key={row.id}>
              <div>
                <div className="font-semibold text-slate-800 dark:text-zinc-200">{row.label}</div>
                <div className="mt-1 text-xs text-slate-500 dark:text-zinc-550">
                  {row.source} - {new Date(row.createdAt).toLocaleString()}
                </div>
              </div>
              <Badge text={row.status} />
            </div>
          ))
        ) : (
          <p className="text-sm text-slate-500 dark:text-zinc-500">Activity will appear as you use the workspace.</p>
        )}
      </div>
    </article>
  );
}

export function ActionButton({ icon: Icon, label, onClick }: { icon: LucideIcon; label: string; onClick: () => void }) {
  return (
    <button
      className="flex w-full items-center gap-3 rounded-md border border-slate-200 dark:border-[#171717] px-3 py-3 text-left text-sm font-semibold hover:bg-slate-50 dark:hover:bg-zinc-900/40 text-slate-700 dark:text-zinc-300"
      onClick={onClick}
      type="button"
    >
      <Icon className="text-orange-600 dark:text-orange-500" size={16} />
      {label}
    </button>
  );
}

export function ServiceRow({ label, value, ready }: { label: string; value: string; ready: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 dark:border-[#171717] pb-3 text-sm">
      <span className="font-semibold text-slate-800 dark:text-zinc-300">{label}</span>
      <Badge text={ready ? value : value} />
    </div>
  );
}
