import { ShieldCheck, Key, Users, FileSpreadsheet, UserCheck } from "lucide-react";
import { tokens } from "@/design-system";

export function SecuritySection() {
  const securityItems = [
    { title: "Google OAuth 2.0", desc: "Official verification protocols and scopes prevent credential exposing.", icon: ShieldCheck },
    { title: "Encrypted Credentials", desc: "Gmail access tokens and database resources are encrypted at rest with AES-256-GCM.", icon: Key },
    { title: "Access Controls", desc: "Granular roles manage actions, ensuring only authorized managers trigger runs.", icon: Users },
    { title: "Audit Logging", desc: "Every lead transition, model prompt, and response dispatch is logged in a secure history table.", icon: FileSpreadsheet },
    { title: "Human Approval Layer", desc: "AI never sends emails on autopilot; all drafts are verified by team leads first.", icon: UserCheck },
  ];

  return (
    <section className="bg-black border-b border-[#171717] py-16 lg:py-24 px-6 lg:px-8" id="security" aria-label="Security & Compliance">
      <div className="mx-auto max-w-3xl text-center mb-12">
        <h2 className="text-3xl font-extrabold tracking-tight text-white">
          Built with security first.
        </h2>
        <p className="mt-4 text-zinc-400 text-sm max-w-xl mx-auto">
          We protect workspace resources and external email connections using secure standards.
        </p>
      </div>

      <div className="mx-auto max-w-6xl grid gap-6 md:grid-cols-2 lg:grid-cols-5">
        {securityItems.map((item) => {
          const Icon = item.icon;
          return (
            <article
              className="border border-[#171717] bg-[#0A0A0A] p-6 rounded-xl shadow-sm flex flex-col justify-between"
              key={item.title}
            >
              <div>
                <div className="size-10 rounded-lg bg-orange-950/20 text-orange-500 flex items-center justify-center border border-orange-900/30">
                  <Icon size={18} aria-hidden="true" />
                </div>
                <h3 className="text-sm font-bold text-white mt-4">{item.title}</h3>
                <p className="text-xs text-zinc-450 mt-2 leading-relaxed">{item.desc}</p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
