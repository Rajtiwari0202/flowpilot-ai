import { EyeOff, AlertTriangle, Layers } from "lucide-react";

export function ProblemSection() {
  const problems = [
    {
      title: "Leads get lost",
      description: "Important conversations disappear in inboxes.",
      icon: EyeOff,
    },
    {
      title: "Teams respond slowly",
      description: "Customers wait while teams coordinate manually.",
      icon: AlertTriangle,
    },
    {
      title: "Work is scattered",
      description: "Email, approvals, CRM updates, and follow-ups happen in different places.",
      icon: Layers,
    },
  ];

  return (
    <section className="bg-slate-50 dark:bg-slate-900/30 py-16 px-6 sm:px-12 max-w-6xl mx-auto border-t border-slate-200 dark:border-slate-800" aria-label="Business Problems">
      <div className="mx-auto max-w-3xl text-center mb-12">
        <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Manual follow-up kills revenue.
        </h2>
        <p className="mt-4 text-slate-500 dark:text-slate-400 text-sm max-w-xl mx-auto">
          Operational latency and missed messages reduce user acquisition and customer retention.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {problems.map((item) => {
          const Icon = item.icon;
          return (
            <article
              className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 rounded-xl shadow-sm"
              key={item.title}
            >
              <div className="size-10 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Icon size={18} aria-hidden="true" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mt-4">{item.title}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">{item.description}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
