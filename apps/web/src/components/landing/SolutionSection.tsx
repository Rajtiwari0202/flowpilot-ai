import { Mail, Sparkles, ShieldCheck, Send, RefreshCw } from "lucide-react";
import { tokens } from "../../design-system/tokens";

export function SolutionSection() {
  const steps = [
    { title: "Lead arrives", desc: "Gmail synced dynamically", icon: Mail },
    { title: "AI drafts response", desc: "GPT-4 contextual output", icon: Sparkles },
    { title: "Manager approves", desc: "Human confirmation control", icon: ShieldCheck },
    { title: "Email sent", desc: "Dispatched via Google API", icon: Send },
    { title: "CRM updated", desc: "Synchronize logs in database", icon: RefreshCw },
  ];

  return (
    <section className={`${tokens.colors.bg} border-b ${tokens.colors.border} py-16 lg:py-24 px-6 lg:px-8`} id="how-it-works" aria-label="Solutions Workflow">
      <div className="mx-auto max-w-3xl text-center mb-12">
        <h2 className={tokens.typography.h2}>
          FlowPilot automates the entire workflow.
        </h2>
        <p className="mt-4 text-slate-500 dark:text-slate-400 text-sm max-w-xl mx-auto">
          From incoming message to dispatch validation — all handled securely.
        </p>
      </div>

      {/* Visual CSS-Animated Workflow Steps */}
      <div className="mx-auto max-w-6xl grid gap-6 md:grid-cols-5 relative">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <div className="flex flex-col items-center text-center relative group" key={step.title}>
              {/* Animated Inner Outer Circle */}
              <div className="size-14 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-center shadow-md text-blue-600 dark:text-blue-400 relative z-10 transition duration-300 group-hover:scale-105 group-hover:border-blue-500 dark:group-hover:border-blue-400">
                <Icon size={18} aria-hidden="true" />
              </div>
              <h3 className="font-bold text-xs text-slate-900 dark:text-white mt-4">{step.title}</h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1.5 leading-normal max-w-[120px]">{step.desc}</p>
              
              {/* Connecting CSS Lines */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-7 left-[calc(50%+1.5rem)] right-[calc(-50%+1.5rem)] h-px bg-slate-200 dark:bg-slate-800 z-0 transition duration-300 group-hover:bg-blue-300 dark:group-hover:bg-blue-900"></div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
