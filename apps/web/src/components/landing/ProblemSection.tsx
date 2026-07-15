import { EyeOff, Clock, Layers } from "lucide-react";
import { tokens } from "../../design-system/tokens";

export function ProblemSection() {
  const problems = [
    {
      title: "Leads get lost",
      description: "Important conversations disappear in inboxes.",
      icon: EyeOff,
    },
    {
      title: "Teams respond too slowly",
      description: "Customers wait while teams coordinate manually.",
      icon: Clock,
    },
    {
      title: "Manual follow-ups waste time",
      description: "Email, approvals, CRM updates, and follow-ups happen in different places.",
      icon: Layers,
    },
  ];

  return (
    <section className={`${tokens.colors.bg} border-b ${tokens.colors.border} py-16 lg:py-24 px-6 lg:px-8`} aria-label="Business Problems">
      <div className="mx-auto max-w-3xl text-center mb-12">
        <h2 className={tokens.typography.h2}>
          Manual follow-up kills revenue.
        </h2>
        <p className="mt-4 text-slate-500 dark:text-slate-400 text-sm max-w-xl mx-auto">
          Operational latency and missed messages reduce user acquisition and customer retention.
        </p>
      </div>

      <div className="mx-auto max-w-6xl grid gap-6 md:grid-cols-3">
        {problems.map((item) => {
          const Icon = item.icon;
          return (
            <article
              className={`border ${tokens.colors.border} ${tokens.colors.card} p-6 ${tokens.radius.card} ${tokens.shadow.sm}`}
              key={item.title}
            >
              <div className="size-10 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-6">
                <Icon size={18} aria-hidden="true" />
              </div>
              <h3 className={tokens.typography.h3}>{item.title}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">{item.description}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
