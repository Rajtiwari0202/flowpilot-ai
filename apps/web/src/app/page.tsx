"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  ArrowRight,
  Bot,
  CheckCircle2,
  Clock3,
  FileText,
  LayoutDashboard,
  Mail,
  PlugZap,
  Settings,
  Sparkles,
  Workflow,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { api } from "@/lib/api";

type Dashboard = {
  user: { name: string; email: string };
  metrics: {
    activeAutomations: number;
    leadsProcessedToday: number;
    pendingApprovals: number;
    errors: number;
    timeSavedMinutesThisWeek: number;
    successRate: number;
  };
  workflows: Array<{ id: string; name: string; status: string; runs: number }>;
  activity: Array<{ id: string; label: string; source: string; status: string }>;
};

const navItems = [
  [LayoutDashboard, "Dashboard"],
  [Workflow, "Automations"],
  [Activity, "Activity"],
  [FileText, "Templates"],
  [PlugZap, "Integrations"],
  [Settings, "Settings"],
] as const;

const emptyMetrics: Dashboard["metrics"] = {
  activeAutomations: 0,
  leadsProcessedToday: 0,
  pendingApprovals: 0,
  errors: 0,
  timeSavedMinutesThisWeek: 0,
  successRate: 100,
};

export default function Home() {
  const [token, setToken] = useState("");
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [message, setMessage] = useState("Connect the API to load your workspace.");

  useEffect(() => {
    const storedToken = window.localStorage.getItem("flowpilot_token") || "";
    setToken(storedToken);
    if (!storedToken) return;

    api<Dashboard>("/api/dashboard", { token: storedToken })
      .then((data) => {
        setDashboard(data);
        setMessage("Live data loaded from the FlowPilot API.");
      })
      .catch(() => setMessage("Your saved session has expired. Sign up again in the prototype for now."));
  }, []);

  const metrics = dashboard?.metrics || emptyMetrics;
  const savedHours = Math.floor(metrics.timeSavedMinutesThisWeek / 60);
  const savedMinutes = metrics.timeSavedMinutesThisWeek % 60;
  const metricCards: Array<[string, string | number, LucideIcon]> = [
    ["Active automations", metrics.activeAutomations, Workflow],
    ["Leads processed", metrics.leadsProcessedToday, Mail],
    ["Pending approvals", metrics.pendingApprovals, Clock3],
    ["Success rate", `${metrics.successRate}%`, CheckCircle2],
  ];

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
        <div className="flex items-center gap-3">
          <div className="grid size-9 place-items-center rounded-lg bg-blue-600 text-white">
            <Bot size={19} />
          </div>
          <div>
            <div className="text-sm font-bold">FlowPilot AI</div>
            <div className="text-xs text-slate-500">Operations workspace</div>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          <span className={`size-2 rounded-full ${token ? "bg-emerald-500" : "bg-amber-500"}`} />
          {token ? "API session detected" : "Setup mode"}
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-4rem)]">
        <aside className="w-56 border-r border-slate-200 bg-white p-3">
          <nav className="space-y-1">
            {navItems.map(([Icon, label], index) => (
              <button
                className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm ${
                  index === 0 ? "bg-blue-50 font-semibold text-blue-700" : "text-slate-600 hover:bg-slate-50"
                }`}
                key={label}
                type="button"
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </nav>
        </aside>

        <section className="flex-1 p-8">
          <div className="mb-7 flex items-end justify-between gap-4">
            <div>
              <p className="mb-1 text-xs font-bold uppercase text-blue-600">Dashboard</p>
              <h1 className="text-2xl font-bold">Welcome back, {dashboard?.user.name?.split(" ")[0] || "founder"}</h1>
              <p className="mt-1 text-sm text-slate-500">{message}</p>
            </div>
            <button className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white" type="button">
              <Sparkles size={16} />
              New automation
            </button>
          </div>

          <div className="mb-6 grid grid-cols-4 gap-4">
            {metricCards.map(([label, value, Icon]) => (
              <article className="rounded-lg border border-slate-200 bg-white p-4" key={String(label)}>
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase text-slate-500">{label}</span>
                  <Icon className="text-blue-600" size={17} />
                </div>
                <div className="text-2xl font-bold">{value}</div>
              </article>
            ))}
          </div>

          <div className="grid grid-cols-[1.55fr_1fr] gap-5">
            <article className="rounded-lg border border-slate-200 bg-white">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                <h2 className="font-bold">Recent activity</h2>
                <button className="flex items-center gap-1 text-sm font-semibold text-blue-600" type="button">
                  View all <ArrowRight size={15} />
                </button>
              </div>
              <div className="p-5">
                {dashboard?.activity.length ? (
                  <div className="space-y-4">
                    {dashboard.activity.slice(0, 5).map((item) => (
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3 text-sm" key={item.id}>
                        <div>
                          <div className="font-semibold">{item.label}</div>
                          <div className="mt-1 text-xs text-slate-500">{item.source}</div>
                        </div>
                        <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">{item.status}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">Activity will appear after your first workflow runs.</p>
                )}
              </div>
            </article>

            <article className="rounded-lg border border-slate-200 bg-white p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-bold">Weekly impact</h2>
                <Clock3 className="text-blue-600" size={18} />
              </div>
              <div className="mb-1 text-3xl font-bold">{savedHours}h {savedMinutes}m</div>
              <p className="text-sm text-slate-500">estimated time saved this week</p>
              <div className="mt-6 rounded-md bg-blue-50 p-4 text-sm text-blue-900">
                Activate a lead follow-up template to start processing customer inquiries automatically.
              </div>
            </article>
          </div>
        </section>
      </div>
    </main>
  );
}
