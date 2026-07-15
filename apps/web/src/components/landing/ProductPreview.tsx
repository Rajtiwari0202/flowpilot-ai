"use client";

import { LayoutDashboard, Mail, Workflow, ShieldCheck, PlugZap, Settings, RefreshCw, LogOut, CheckCircle2 } from "lucide-react";
import { tokens } from "../../design-system/tokens";

export function ProductPreview() {
  const mockMetrics = [
    { label: "New Leads", value: 12, icon: Mail },
    { label: "Pending Approvals", value: 2, icon: ShieldCheck },
    { label: "Active Workflows", value: 3, icon: Workflow },
    { label: "Emails Sent", value: 45, icon: CheckCircle2 },
  ];

  const mockActivities = [
    { title: "Sarah Chen", subtitle: "New Lead Captured", time: "2m ago", status: "New" },
    { title: "Approval Requested", subtitle: "AI Response Draft Ready", time: "5m ago", status: "Pending" },
    { title: "CRM Updated", subtitle: "Lead Synced to Database", time: "8m ago", status: "Success" },
  ];

  return (
    <section className={`${tokens.colors.bg} border-b ${tokens.colors.border} py-16 lg:py-24 px-6 lg:px-8`} id="product-preview" aria-label="Product Showcase">
      <div className="mx-auto max-w-3xl text-center mb-12">
        <h2 className={tokens.typography.h2}>The operational workspace.</h2>
        <p className="mt-4 text-slate-500 dark:text-slate-400 text-sm max-w-xl mx-auto">
          An integrated system to sync communication pipelines, review automation runs, and manage lead records.
        </p>
      </div>

      {/* Main Mock Dashboard Frame */}
      <div className={`mx-auto max-w-5xl border ${tokens.colors.border} rounded-xl overflow-hidden ${tokens.shadow.xxl} bg-white dark:bg-slate-950 select-none`}>
        {/* Browser Header Bar */}
        <div className="bg-slate-100 dark:bg-slate-900 px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="size-3 rounded-full bg-slate-300 dark:bg-slate-700"></span>
            <span className="size-3 rounded-full bg-slate-300 dark:bg-slate-700"></span>
            <span className="size-3 rounded-full bg-slate-300 dark:bg-slate-700"></span>
          </div>
          <div className="mx-auto bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md text-[11px] text-slate-400 dark:text-slate-500 py-1 px-16 text-center select-none truncate max-w-sm">
            https://flowpilot-ai-web.vercel.app/dashboard
          </div>
        </div>

        {/* Dashboard Shell */}
        <div className="bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 flex flex-col min-h-[500px]">
          {/* Top Bar Header */}
          <header className="flex h-14 items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-6">
            <div className="flex items-center gap-2">
              <div className="grid size-7 place-items-center rounded-lg bg-blue-600 text-white font-bold text-xs">FP</div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100">FlowPilot AI</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-[11px] font-semibold">Raj Digital Agency</div>
                <div className="text-[9px] text-slate-500 dark:text-slate-400">rajtiwari16916@gmail.com</div>
              </div>
              <div className="size-8 rounded-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-400">
                <LogOut size={12} />
              </div>
            </div>
          </header>

          <div className="flex flex-1">
            {/* Navigation Sidebar */}
            <aside className="w-44 shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-2.5 hidden sm:block">
              <nav className="space-y-0.5">
                <div className="flex items-center gap-2.5 rounded-md px-2.5 py-2 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-450 font-bold text-xs">
                  <LayoutDashboard size={13} /> Dashboard
                </div>
                <div className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-slate-500 dark:text-slate-450 text-xs">
                  <Mail size={13} /> Leads
                </div>
                <div className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-slate-500 dark:text-slate-450 text-xs">
                  <Workflow size={13} /> Workflows
                </div>
                <div className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-slate-500 dark:text-slate-450 text-xs">
                  <ShieldCheck size={13} /> Approvals
                </div>
                <div className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-slate-500 dark:text-slate-450 text-xs">
                  <PlugZap size={13} /> Integrations
                </div>
                <div className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-slate-500 dark:text-slate-450 text-xs">
                  <Settings size={13} /> Settings
                </div>
              </nav>
            </aside>

            {/* Dashboard Content Container */}
            <main className="flex-1 p-5 sm:p-6">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase text-blue-600 dark:text-blue-400">dashboard</p>
                  <h3 className="text-lg font-bold text-slate-850 dark:text-slate-100">Overview Panel</h3>
                </div>
                <div className="size-8 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex items-center justify-center text-slate-400 dark:text-slate-500">
                  <RefreshCw size={14} />
                </div>
              </div>

              {/* Metrics Row */}
              <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
                {mockMetrics.map((card) => {
                  const Icon = card.icon;
                  return (
                    <article className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-lg p-3 shadow-sm" key={card.label}>
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-[9px] font-bold uppercase text-slate-500 dark:text-slate-450">{card.label}</span>
                        <Icon className="text-blue-600 dark:text-blue-400" size={13} />
                      </div>
                      <div className="text-lg font-bold text-slate-800 dark:text-slate-150">{card.value}</div>
                    </article>
                  );
                })}
              </div>

              {/* Activity & Workflows Details Grid */}
              <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
                {/* Activity Feed */}
                <article className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-lg p-4 shadow-sm">
                  <h4 className="font-bold text-xs text-slate-800 dark:text-slate-100 mb-3">Activity Feed</h4>
                  <div className="space-y-2">
                    {mockActivities.map((row) => (
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-900 pb-2 text-[10px]" key={row.title}>
                        <div>
                          <div className="font-bold text-slate-700 dark:text-slate-300">{row.title}</div>
                          <div className="text-slate-400 dark:text-slate-500">{row.subtitle}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-slate-400 dark:text-slate-500">{row.time}</div>
                          <span className="text-[8px] uppercase tracking-wider font-extrabold text-blue-600 dark:text-blue-400">{row.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </article>

                {/* Workflow Card Mock */}
                <article className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-lg p-4 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2 mb-3">
                      <h4 className="font-bold text-xs text-slate-800 dark:text-slate-100">Workflow Details</h4>
                      <span className="rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400 px-1.5 py-0.5 text-[8px] font-bold">Active</span>
                    </div>
                    <div className="space-y-2 text-[10px]">
                      <div>
                        <span className="text-slate-400 dark:text-slate-550 block uppercase text-[8px] font-bold">Name</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-350">Lead Follow-Up Pipeline</span>
                      </div>
                      <div>
                        <span className="text-slate-400 dark:text-slate-550 block uppercase text-[8px] font-bold">Trigger</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-350">New Lead Captured</span>
                      </div>
                      <div>
                        <span className="text-slate-400 dark:text-slate-550 block uppercase text-[8px] font-bold">Last Run</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-350">2 minutes ago</span>
                      </div>
                    </div>
                  </div>
                </article>
              </div>
            </main>
          </div>
        </div>
      </div>
    </section>
  );
}
