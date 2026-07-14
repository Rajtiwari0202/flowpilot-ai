import { Bot, CheckCircle2, Mail, ShieldCheck, Workflow, Eye } from "lucide-react";

export function FeaturesSection() {
  const items = [
    { title: "Lead Capture", desc: "Convert emails into actionable leads automatically.", icon: CheckCircle2 },
    { title: "AI Drafts", desc: "Generate responses before your team starts typing using advanced GPT models.", icon: Bot },
    { title: "Approval Queue", desc: "Keep humans in control with review steps before any email is dispatched.", icon: ShieldCheck },
    { title: "Workflow Automation", desc: "Automate repetitive operational tasks like statuses and notifications.", icon: Workflow },
    { title: "Team Visibility", desc: "Track every action, state transition, and run metric across workflows.", icon: Eye },
    { title: "Gmail Integration", desc: "Connect your inbox securely with official Google OAuth consent screens.", icon: Mail },
  ];

  return (
    <section className="bg-slate-50 dark:bg-slate-900/30 py-16 px-6 sm:px-12 max-w-6xl mx-auto border-t border-slate-200 dark:border-slate-800" id="features" aria-label="Product Features Detail">
      <div className="mx-auto max-w-3xl text-center mb-12">
        <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Built for modern operations.
        </h2>
        <p className="mt-4 text-slate-500 dark:text-slate-400 text-sm max-w-xl mx-auto">
          Robust, extensible, and fully integrated with your business email flow.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div className="flex gap-4 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5 rounded-xl shadow-sm" key={item.title}>
              <div className="size-10 shrink-0 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Icon size={18} aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">{item.title}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
