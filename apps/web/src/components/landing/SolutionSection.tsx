import { Mail, CheckSquare, Sparkles, Send, ShieldCheck, RefreshCw } from "lucide-react";

export function SolutionSection() {
  const steps = [
    { title: "New Lead", desc: "Gmail message received", icon: Mail },
    { title: "AI Classification", desc: "Evaluate intent & tone", icon: Sparkles },
    { title: "Draft Reply", desc: "Contextual email generated", icon: CheckSquare },
    { title: "Approval", desc: "Human confirmation request", icon: ShieldCheck },
    { title: "Send Email", desc: "Delivered via Google API", icon: Send },
    { title: "CRM Update", desc: "Synchronize interaction log", icon: RefreshCw },
  ];

  return (
    <section className="bg-slate-50 dark:bg-slate-900/30 py-16 px-6 sm:px-12 max-w-6xl mx-auto border-t border-slate-200 dark:border-slate-800" id="how-it-works" aria-label="Solutions Workflow">
      <div className="mx-auto max-w-3xl text-center mb-12">
        <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          FlowPilot automates the entire workflow.
        </h2>
        <p className="mt-4 text-slate-500 dark:text-slate-400 text-sm max-w-xl mx-auto">
          A seamless transition from customer inquiry to verified automated reply.
        </p>
      </div>

      {/* Visual Workflow Steps */}
      <div className="grid gap-6 md:grid-cols-3 lg:grid-cols-6 relative">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <div className="flex flex-col items-center text-center relative" key={step.title}>
              <div className="size-12 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex items-center justify-center shadow-sm text-blue-600 dark:text-blue-400 relative z-10">
                <Icon size={18} aria-hidden="true" />
              </div>
              <h3 className="font-bold text-xs text-slate-900 dark:text-white mt-4">{step.title}</h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1.5 leading-normal max-w-[120px]">{step.desc}</p>
              
              {/* Connection Arrows between steps */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-6 left-[calc(50%+1.5rem)] right-[calc(-50%+1.5rem)] h-px bg-slate-200 dark:bg-slate-800 z-0"></div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
