import { ShieldCheck, Key, Users, FileSpreadsheet } from "lucide-react";
import { tokens } from "../../design-system/tokens";

export function SecuritySection() {
  const securityItems = [
    { title: "Google OAuth 2.0", desc: "Secure official Google consent screen authentication.", icon: ShieldCheck },
    { title: "Encrypted Credentials", desc: "Sensitive client tokens are encrypted at rest with AES-256-GCM.", icon: Key },
    { title: "Role-based Access", desc: "Permissions matching workspace roles and active organization profiles.", icon: Users },
    { title: "Audit Logging", desc: "Actions are fully logged and tracked across transaction tables.", icon: FileSpreadsheet },
  ];

  return (
    <section className={`${tokens.colors.bg} border-b ${tokens.colors.border} py-16 lg:py-24 px-6 lg:px-8`} id="security" aria-label="Security & Compliance">
      <div className="mx-auto max-w-3xl text-center mb-12">
        <h2 className={tokens.typography.h2}>
          Built with security first.
        </h2>
        <p className="mt-4 text-slate-500 dark:text-slate-400 text-sm max-w-xl mx-auto">
          We protect workspace resources and external email connections using secure standards.
        </p>
      </div>

      <div className="mx-auto max-w-6xl grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {securityItems.map((item) => {
          const Icon = item.icon;
          return (
            <article
              className={`border ${tokens.colors.border} ${tokens.colors.card} p-6 ${tokens.radius.card} ${tokens.shadow.sm} flex flex-col justify-between`}
              key={item.title}
            >
              <div>
                <div className="size-10 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Icon size={18} aria-hidden="true" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-4">{item.title}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">{item.desc}</p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
