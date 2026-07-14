import { ShieldCheck, Key, UserCheck, FileSpreadsheet } from "lucide-react";

export function SecuritySection() {
  const securityItems = [
    { title: "OAuth Authentication", desc: "Secure official Google consent screen authentication.", icon: ShieldCheck },
    { title: "Encrypted Credentials", desc: "Sensitive client tokens are encrypted at rest with AES-256-GCM.", icon: Key },
    { title: "Approval Controls", desc: "Humans stay in control of outbound communication through the approval queue.", icon: UserCheck },
    { title: "Audit Logging", desc: "Actions are fully logged and tracked across database tables.", icon: FileSpreadsheet },
  ];

  return (
    <section className="bg-slate-50 py-16 px-6 sm:px-12 max-w-6xl mx-auto border-t border-slate-200" id="security" aria-label="Security & Compliance">
      <div className="mx-auto max-w-3xl text-center mb-12">
        <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">
          Built with security first.
        </h2>
        <p className="mt-4 text-slate-500 text-sm max-w-xl mx-auto">
          We protect user data using standard cryptographic keys and security models.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {securityItems.map((item) => {
          const Icon = item.icon;
          return (
            <article
              className="border border-slate-200 bg-white p-6 rounded-xl shadow-sm flex flex-col justify-between"
              key={item.title}
            >
              <div>
                <div className="size-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Icon size={18} aria-hidden="true" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 mt-4">{item.title}</h3>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">{item.desc}</p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
