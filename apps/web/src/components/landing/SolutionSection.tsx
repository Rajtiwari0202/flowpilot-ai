import { Mail, Sparkles, FileText, ShieldCheck, Send, RefreshCw } from "lucide-react";
import { tokens } from "@/design-system";

export function SolutionSection() {
  const steps = [
    { title: "Lead Arrives", desc: "Gmail synced dynamically", icon: Mail },
    { title: "AI Analyzes", desc: "Intent and context parsed", icon: Sparkles },
    { title: "Draft Created", desc: "GPT-4 contextual reply", icon: FileText },
    { title: "Manager Approves", desc: "Human confirmation control", icon: ShieldCheck },
    { title: "Email Sent", desc: "Dispatched via Google API", icon: Send },
    { title: "CRM Updated", desc: "Synchronize logs in database", icon: RefreshCw },
  ];

  return (
    <section className="bg-black border-b border-[#171717] py-16 lg:py-24 px-6 lg:px-8" id="how-it-works" aria-label="Solutions Workflow">
      <div className="mx-auto max-w-3xl text-center mb-12">
        <h2 className="text-3xl font-extrabold tracking-tight text-white">
          ACE automates the entire workflow.
        </h2>
        <p className="mt-4 text-zinc-400 text-sm max-w-xl mx-auto">
          From incoming message to dispatch validation — all handled securely.
        </p>
      </div>

      {/* Visual CSS-Animated Workflow Steps */}
      <div className="mx-auto max-w-6xl grid gap-6 md:grid-cols-6 relative">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <div className="flex flex-col items-center text-center relative group" key={step.title}>
              {/* Animated Circle */}
              <div className="size-14 rounded-full border border-[#171717] bg-[#0A0A0A] flex items-center justify-center shadow-md text-orange-500 relative z-10 transition duration-300 group-hover:scale-105 group-hover:border-orange-500">
                <Icon size={18} aria-hidden="true" />
              </div>
              <h3 className="font-bold text-xs text-white mt-4">{step.title}</h3>
              <p className="text-[10px] text-zinc-450 mt-1.5 leading-normal max-w-[120px]">{step.desc}</p>
              
              {/* Connecting CSS Lines */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-7 left-[calc(50%+1.5rem)] right-[calc(-50%+1.5rem)] h-px bg-[#171717] z-0 transition duration-300 group-hover:bg-orange-900/40"></div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
