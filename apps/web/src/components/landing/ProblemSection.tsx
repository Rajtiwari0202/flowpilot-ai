import { EyeOff, Clock, Layers } from "lucide-react";
import { tokens } from "@/design-system";

export function ProblemSection() {
  const problems = [
    {
      title: "Lost Leads",
      description: "Critical incoming messages disappear into cluttered inboxes before they are classified or assigned.",
      icon: EyeOff,
    },
    {
      title: "Slow Response Times",
      description: "High-value inquiries sit unanswered for hours while managers coordinate schedules and drafts manually.",
      icon: Clock,
    },
    {
      title: "Scattered Operations",
      description: "Drafting follow-ups, validating details, requesting approvals, and updating CRMs are disconnected.",
      icon: Layers,
    },
  ];

  return (
    <section className="bg-black border-b border-[#171717] py-16 lg:py-24 px-6 lg:px-8" aria-label="Business Problems">
      <div className="mx-auto max-w-3xl text-center mb-12">
        <h2 className="text-3xl font-extrabold tracking-tight text-white">
          Manual follow-up kills revenue.
        </h2>
        <p className="mt-4 text-zinc-400 text-sm max-w-xl mx-auto">
          Operational latency and missed messages reduce user acquisition and customer retention.
        </p>
      </div>

      <div className="mx-auto max-w-6xl grid gap-6 md:grid-cols-3">
        {problems.map((item) => {
          const Icon = item.icon;
          return (
            <article
              className="border border-[#171717] bg-[#0A0A0A] p-6 rounded-xl shadow-sm"
              key={item.title}
            >
              <div className="size-10 rounded-lg bg-orange-950/20 text-orange-500 flex items-center justify-center mb-6 border border-orange-900/30">
                <Icon size={18} aria-hidden="true" />
              </div>
              <h3 className="text-base font-bold text-white">{item.title}</h3>
              <p className="text-xs text-zinc-450 mt-2 leading-relaxed">{item.description}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
