"use client";

import { LayoutDashboard, Mail, Workflow, ShieldCheck, PlugZap, Settings, RefreshCw, LogOut, CheckCircle2 } from "lucide-react";
import { tokens } from "@/design-system";

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
    <section className="bg-black border-b border-[#171717] py-16 lg:py-24 px-6 lg:px-8" id="product-preview" aria-label="Product Showcase">
      <div className="mx-auto max-w-3xl text-center mb-12">
        <h2 className="text-3xl font-extrabold tracking-tight text-white">The operational workspace.</h2>
        <p className="mt-4 text-zinc-400 text-sm max-w-xl mx-auto">
          An integrated system to sync communication pipelines, review automation runs, and manage lead records.
        </p>
      </div>

      {/* Main Mock Dashboard Frame */}
      <div className="mx-auto max-w-5xl border border-[#171717] rounded-xl overflow-hidden shadow-2xl bg-[#0A0A0A] select-none">
        {/* Browser Header Bar */}
        <div className="bg-zinc-950 px-4 py-3 border-b border-[#171717] flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="size-3 rounded-full bg-[#171717]"></span>
            <span className="size-3 rounded-full bg-[#171717]"></span>
            <span className="size-3 rounded-full bg-[#171717]"></span>
          </div>
          <div className="mx-auto bg-black border border-[#171717] rounded-md text-[11px] text-zinc-500 py-1 px-16 text-center select-none truncate max-w-sm">
            https://ace.ai/dashboard
          </div>
        </div>

        {/* Dashboard Shell */}
        <div className="bg-black text-white flex flex-col min-h-[500px]">
          {/* Top Bar Header */}
          <header className="flex h-14 items-center justify-between border-b border-[#171717] bg-[#0A0A0A] px-6">
            <div className="flex items-center gap-2">
              <div className="grid size-7 place-items-center rounded-lg bg-orange-600 text-white font-bold text-xs">ACE</div>
              <span className="text-xs font-bold text-white">ACE Workspace</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-[11px] font-semibold">Raj Digital Agency</div>
                <div className="text-[9px] text-zinc-550">rajtiwari16916@gmail.com</div>
              </div>
              <div className="size-8 rounded-full border border-[#171717] bg-black flex items-center justify-center text-zinc-500">
                <LogOut size={12} />
              </div>
            </div>
          </header>

          <div className="flex flex-1">
            {/* Navigation Sidebar */}
            <aside className="w-44 shrink-0 border-r border-[#171717] bg-[#0A0A0A] p-2.5 hidden sm:block">
              <nav className="space-y-0.5">
                <div className="flex items-center gap-2.5 rounded-md px-2.5 py-2 bg-orange-950/20 text-orange-400 font-bold text-xs border border-orange-900/30">
                  <LayoutDashboard size={13} /> Dashboard
                </div>
                <div className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-zinc-400 text-xs">
                  <Mail size={13} /> Leads
                </div>
                <div className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-zinc-400 text-xs">
                  <Workflow size={13} /> Workflows
                </div>
                <div className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-zinc-400 text-xs">
                  <ShieldCheck size={13} /> Approvals
                </div>
                <div className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-zinc-400 text-xs">
                  <PlugZap size={13} /> Integrations
                </div>
                <div className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-zinc-400 text-xs">
                  <Settings size={13} /> Settings
                </div>
              </nav>
            </aside>

            {/* Dashboard Content Container */}
            <main className="flex-1 p-5 sm:p-6 bg-black">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase text-orange-500">dashboard</p>
                  <h3 className="text-lg font-bold text-white">Overview Panel</h3>
                </div>
                <div className="size-8 rounded-md border border-[#171717] bg-[#0A0A0A] flex items-center justify-center text-zinc-500">
                  <RefreshCw size={14} />
                </div>
              </div>

              {/* Metrics Row */}
              <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
                {mockMetrics.map((card) => {
                  const Icon = card.icon;
                  return (
                    <article className="border border-[#171717] bg-[#0A0A0A] rounded-lg p-3 shadow-sm" key={card.label}>
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-[9px] font-bold uppercase text-zinc-500">{card.label}</span>
                        <Icon className="text-orange-500" size={13} />
                      </div>
                      <div className="text-lg font-bold text-white">{card.value}</div>
                    </article>
                  );
                })}
              </div>

              {/* Activity & Workflows Details Grid */}
              <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
                {/* Activity Feed */}
                <article className="border border-[#171717] bg-[#0A0A0A] rounded-lg p-4 shadow-sm">
                  <h4 className="font-bold text-xs text-white mb-3">Activity Feed</h4>
                  <div className="space-y-2">
                    {mockActivities.map((row) => (
                      <div className="flex items-center justify-between border-b border-[#171717] pb-2 text-[10px]" key={row.title}>
                        <div>
                          <div className="font-bold text-zinc-200">{row.title}</div>
                          <div className="text-zinc-500">{row.subtitle}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-zinc-500">{row.time}</div>
                          <span className="text-[8px] uppercase tracking-wider font-extrabold text-orange-500">{row.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </article>

                {/* Workflow Card Mock */}
                <article className="border border-[#171717] bg-[#0A0A0A] rounded-lg p-4 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between border-b border-[#171717] pb-2 mb-3">
                      <h4 className="font-bold text-xs text-white">Workflow Details</h4>
                      <span className="rounded bg-emerald-950/40 text-emerald-400 px-1.5 py-0.5 text-[8px] font-bold border border-emerald-900/30">Active</span>
                    </div>
                    <div className="space-y-2 text-[10px]">
                      <div>
                        <span className="text-zinc-500 block uppercase text-[8px] font-bold">Name</span>
                        <span className="font-semibold text-zinc-300">Lead Follow-Up Pipeline</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block uppercase text-[8px] font-bold">Trigger</span>
                        <span className="font-semibold text-zinc-300">New Lead Captured</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block uppercase text-[8px] font-bold">Last Run</span>
                        <span className="font-semibold text-zinc-300">2 minutes ago</span>
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
