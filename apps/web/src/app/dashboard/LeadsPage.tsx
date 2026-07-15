import { FormEvent } from "react";
import { Sparkles } from "lucide-react";
import { Lead } from "./types";
import { Field, Badge } from "@/components/AuthComponents";

interface LeadsPageProps {
  leads: Lead[];
  submit: (event: FormEvent<HTMLFormElement>) => void;
  loading: boolean;
}

export function LeadsPage({ leads, submit, loading }: LeadsPageProps) {
  return (
    <div className="grid gap-5 xl:grid-cols-[0.9fr_1.4fr]">
      <form className="panel space-y-4 p-5 bg-white dark:bg-[#0A0A0A] border-slate-200 dark:border-[#171717]" onSubmit={submit}>
        <h2 className="font-bold text-slate-900 dark:text-white">Capture test lead</h2>
        <p className="text-sm text-slate-500 dark:text-zinc-550">This simulates a website form or inbox inquiry.</p>
        <Field label="Lead name" name="name" placeholder="Sarah Chen" required />
        <Field label="Email" name="email" placeholder="sarah@example.com" required type="email" />
        <Field label="Phone" name="phone" placeholder="+91 98765 43210" />
        <label className="block text-sm font-semibold text-slate-700 dark:text-zinc-300">
          Inquiry
          <textarea
            className="input mt-2 min-h-28 resize-y dark:bg-slate-900/50"
            name="message"
            placeholder="I need help automating follow-ups for my agency."
            required
          />
        </label>
        <button className="primary-button w-full" disabled={loading} type="submit">
          <Sparkles size={16} />
          {loading ? "Preparing draft..." : "Capture lead and draft reply"}
        </button>
      </form>
      <article className="panel p-5 bg-white dark:bg-[#0A0A0A] border-slate-200 dark:border-[#171717]">
        <h2 className="font-bold text-slate-900 dark:text-white">Lead inbox</h2>
        <div className="mt-4 space-y-3">
          {leads.length ? (
            leads.map((lead) => (
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#171717] pb-3 text-sm" key={lead.id}>
                <div>
                  <div className="font-semibold text-slate-800 dark:text-zinc-200">{lead.name}</div>
                  <div className="mt-1 text-xs text-slate-500 dark:text-zinc-550">
                    {lead.email} - {lead.source}
                  </div>
                </div>
                <Badge text={lead.status} />
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-500 dark:text-zinc-500">Your captured leads will appear here.</p>
          )}
        </div>
      </article>
    </div>
  );
}
