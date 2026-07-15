import { ShieldCheck, Mail, Users, RefreshCw, FileSpreadsheet } from "lucide-react";
import { tokens } from "@/design-system";

export function TrustBar() {
  const trustItems = [
    { label: "Google OAuth", icon: ShieldCheck },
    { label: "Gmail Sync", icon: Mail },
    { label: "Approval Queue", icon: Users },
    { label: "Lead Automation", icon: RefreshCw },
    { label: "Audit Logs", icon: FileSpreadsheet },
  ];

  return (
    <section className="bg-black border-b border-[#171717] py-8 px-6 lg:px-8" aria-label="Trust Parameters">
      <div className="mx-auto max-w-7xl flex flex-wrap items-center justify-center gap-x-12 gap-y-6 text-xs font-bold uppercase tracking-wider text-zinc-500">
        {trustItems.map((item) => {
          const Icon = item.icon;
          return (
            <div className="flex items-center gap-2 select-none" key={item.label}>
              <Icon size={14} className="text-zinc-500" />
              <span>{item.label}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
