import { FormEvent } from "react";
import { Settings } from "lucide-react";
import { Business, SystemStatus } from "./types";
import { Field, Select } from "@/components/AuthComponents";
import { ServiceRow } from "./SharedComponents";

interface SettingsPageProps {
  business: Business;
  submit: (event: FormEvent<HTMLFormElement>) => void;
  loading: boolean;
  startSubscriptionCheckout: () => Promise<void>;
  systemStatus: SystemStatus | null;
}

export function SettingsPage({ business, submit, loading, startSubscriptionCheckout, systemStatus }: SettingsPageProps) {
  const services = systemStatus?.services;

  return (
    <div className="grid max-w-4xl gap-5 xl:grid-cols-[1.3fr_1fr]">
      <form className="panel grid gap-4 p-5 sm:grid-cols-2 bg-white dark:bg-[#0A0A0A] border-slate-200 dark:border-[#171717]" onSubmit={submit}>
        <div className="sm:col-span-2">
          <h2 className="font-bold text-slate-900 dark:text-white">Business settings</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-zinc-550">Update the profile used to personalize AI drafts.</p>
        </div>
        <div className="sm:col-span-2">
          <Field defaultValue={business.name} label="Business name" name="name" required />
        </div>
        <Select
          defaultValue={business.type}
          label="Business type"
          name="type"
          options={["agency", "e-commerce", "service_business", "startup", "solo_founder", "other"]}
        />
        <Select defaultValue={business.tone} label="Reply tone" name="tone" options={["professional", "friendly"]} />
        <button className="primary-button sm:col-span-2 animate-none" disabled={loading} type="submit">
          {loading ? "Saving..." : "Save settings"}
        </button>
      </form>
      <article className="panel p-5 bg-white dark:bg-[#0A0A0A] border-slate-200 dark:border-[#171717]">
        <h2 className="font-bold text-slate-900 dark:text-white">Production readiness</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-zinc-550">Configured services detected by the API.</p>
        <div className="mt-4 space-y-3">
          <ServiceRow label="AI drafts" value={services?.ai.provider || "checking"} ready={Boolean(services?.ai.configured)} />
          <ServiceRow label="Database" value={services?.database.provider || "checking"} ready={Boolean(services?.database.configured)} />
          <ServiceRow label="Account email" value={services?.accountEmail.provider || "checking"} ready={Boolean(services?.accountEmail.configured)} />
          <ServiceRow
            label="Razorpay billing"
            value={services?.billing.configured ? "configured" : "setup required"}
            ready={Boolean(services?.billing.configured)}
          />
          <ServiceRow
            label="Lead webhook"
            value={services?.leadWebhook.configured ? "secured" : "setup required"}
            ready={Boolean(services?.leadWebhook.configured)}
          />
          <ServiceRow
            label="Gmail OAuth"
            value={services?.gmail.configured ? "configured" : "setup required"}
            ready={Boolean(services?.gmail.configured)}
          />
          <ServiceRow
            label="HubSpot OAuth"
            value={services?.hubspot.configured ? "configured" : "setup required"}
            ready={Boolean(services?.hubspot.configured)}
          />
          <ServiceRow
            label="WhatsApp API"
            value={services?.whatsapp.configured ? "configured" : "setup required"}
            ready={Boolean(services?.whatsapp.configured)}
          />
        </div>
        <button
          className="secondary-button mt-5 w-full"
          disabled={loading || !services?.billing.configured}
          onClick={startSubscriptionCheckout}
          type="button"
        >
          <Settings size={15} />
          Open Razorpay checkout
        </button>
      </article>
    </div>
  );
}
