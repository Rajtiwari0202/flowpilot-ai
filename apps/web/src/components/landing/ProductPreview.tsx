import { LayoutDashboard, Workflow, Mail, ShieldCheck, FileText, PlugZap, Activity, Settings, RefreshCw, LogOut, CheckCircle2, Clock3 } from "lucide-react";

export function ProductPreview() {
  const mockMetrics = [
    { label: "Active automations", value: 3, icon: Workflow },
    { label: "Leads processed", value: 12, icon: Mail },
    { label: "Pending approvals", value: 2, icon: Clock3 },
    { label: "Success rate", value: "100%", icon: CheckCircle2 },
  ];

  const mockActivities = [
    { label: "Lead Sarah Chen qualified", source: "workflow engine", status: "success", time: "5m ago" },
    { label: "AI draft generated for Sarah Chen", source: "openai gpt-4", status: "success", time: "5m ago" },
    { label: "Gmail inbox sync completed", source: "gmail system", status: "success", time: "12m ago" },
  ];

  return (
    <section className="bg-slate-50 py-10 px-6 sm:px-12 max-w-6xl mx-auto border-t border-slate-200" aria-label="Product Preview">
      <h2 className="text-center text-xs font-bold uppercase tracking-wider text-slate-500 mb-8">
        Take a look inside FlowPilot AI
      </h2>
      <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xl bg-white select-none">
        {/* Mock Browser Title Bar */}
        <div className="bg-slate-100 px-4 py-3 border-b border-slate-200 flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="size-3 rounded-full bg-slate-300"></span>
            <span className="size-3 rounded-full bg-slate-300"></span>
            <span className="size-3 rounded-full bg-slate-300"></span>
          </div>
          <div className="mx-auto bg-white border border-slate-200 rounded-md text-[11px] text-slate-400 py-1 px-16 text-center select-none truncate max-w-sm">
            https://flowpilot-ai-web.vercel.app/dashboard
          </div>
        </div>

        {/* Dashboard Shell */}
        <div className="bg-slate-50 text-slate-900 flex flex-col min-h-[500px]">
          {/* Header */}
          <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-6">
            <div className="flex items-center gap-2">
              <div className="grid size-7 place-items-center rounded-lg bg-blue-600 text-white font-bold text-xs">
                FP
              </div>
              <span className="text-xs font-bold text-slate-800">FlowPilot AI</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-[11px] font-semibold">Raj Digital Agency</div>
                <div className="text-[9px] text-slate-500">rajtiwari16916@gmail.com</div>
              </div>
              <div className="size-8 rounded-full border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-400">
                <LogOut size={13} />
              </div>
            </div>
          </header>

          {/* Main Layout Area */}
          <div className="flex flex-1">
            {/* Sidebar */}
            <aside className="w-44 shrink-0 border-r border-slate-200 bg-white p-2.5 hidden sm:block">
              <nav className="space-y-0.5">
                <div className="flex items-center gap-2.5 rounded-md px-2.5 py-2 bg-blue-50 text-blue-700 font-bold text-xs">
                  <LayoutDashboard size={13} /> Overview
                </div>
                <div className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-slate-500 text-xs">
                  <Workflow size={13} /> Automations
                </div>
                <div className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-slate-500 text-xs">
                  <Mail size={13} /> Leads
                </div>
                <div className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-slate-500 text-xs">
                  <ShieldCheck size={13} /> Approvals
                </div>
                <div className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-slate-500 text-xs">
                  <FileText size={13} /> Templates
                </div>
                <div className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-slate-500 text-xs">
                  <PlugZap size={13} /> Integrations
                </div>
                <div className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-slate-500 text-xs">
                  <Activity size={13} /> Activity
                </div>
                <div className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-slate-500 text-xs">
                  <Settings size={13} /> Settings
                </div>
              </nav>
            </aside>

            {/* Dashboard Content */}
            <main className="flex-1 p-5 sm:p-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase text-blue-600">dashboard</p>
                  <h3 className="text-lg font-bold text-slate-800">Operations overview</h3>
                </div>
                <div className="size-8 rounded-md border border-slate-200 bg-white flex items-center justify-center text-slate-400">
                  <RefreshCw size={14} />
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
                {mockMetrics.map((card) => {
                  const Icon = card.icon;
                  return (
                    <article className="border border-slate-200 bg-white rounded-lg p-3 shadow-sm" key={card.label}>
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-[9px] font-bold uppercase text-slate-500">{card.label}</span>
                        <Icon className="text-blue-600" size={13} />
                      </div>
                      <div className="text-lg font-bold text-slate-800">{card.value}</div>
                    </article>
                  );
                })}
              </div>

              {/* Feed & Quick Actions */}
              <div className="mt-4 grid gap-4 lg:grid-cols-[1.5fr_1fr]">
                {/* Recent Activity Card */}
                <article className="border border-slate-200 bg-white rounded-lg p-4 shadow-sm">
                  <h4 className="font-bold text-sm text-slate-800 mb-3">Recent activity</h4>
                  <div className="space-y-2">
                    {mockActivities.map((row) => (
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2 text-[11px]" key={row.label}>
                        <div>
                          <div className="font-semibold text-slate-700">{row.label}</div>
                          <div className="text-[9px] text-slate-400">{row.source} - {row.time}</div>
                        </div>
                        <span className="rounded-full bg-emerald-50 text-emerald-700 px-1.5 py-0.5 text-[9px] font-bold">
                          {row.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </article>

                {/* Quick Actions Panel */}
                <article className="border border-slate-200 bg-white rounded-lg p-4 shadow-sm flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-slate-800">Quick actions</h4>
                    <p className="text-[11px] text-slate-500 mt-1">Move a real lead through the local MVP.</p>
                  </div>
                  <div className="space-y-1.5 mt-4">
                    <div className="border border-slate-200 rounded-md p-2 flex items-center gap-2 text-xs font-semibold hover:bg-slate-50 transition cursor-pointer">
                      <span className="text-blue-600 font-bold">+</span> Capture a test lead
                    </div>
                    <div className="border border-slate-200 rounded-md p-2 flex items-center gap-2 text-xs font-semibold hover:bg-slate-50 transition cursor-pointer">
                      <span className="text-blue-600 font-bold">✓</span> Review approvals (2)
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
