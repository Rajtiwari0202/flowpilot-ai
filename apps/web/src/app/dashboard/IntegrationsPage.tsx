import { Mail, MessageSquare, PlugZap, CheckCircle2, RefreshCw } from "lucide-react";
import { Integration } from "./types";

interface IntegrationsPageProps {
  integrations: Integration[];
  connect: (provider: string, title: string) => Promise<void>;
  syncGmail: () => Promise<void>;
  loading: boolean;
}

export function IntegrationsPage({ integrations, connect, syncGmail, loading }: IntegrationsPageProps) {
  const providers = [
    ["gmail", Mail, "Gmail", "Monitor and send lead follow-up emails"],
    ["whatsapp", MessageSquare, "WhatsApp Business", "Route customer messages to your team"],
    ["hubspot", PlugZap, "HubSpot CRM", "Sync leads and follow-up activity"],
  ] as const;

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {providers.map(([provider, Icon, title, description]) => {
        const connected = integrations.some((row) => row.provider === provider && row.status === "connected");
        return (
          <article className="panel p-5 bg-white dark:bg-[#0A0A0A] border-slate-200 dark:border-[#171717]" key={provider}>
            <div className="grid size-10 place-items-center rounded-lg bg-orange-50 dark:bg-orange-950/20 text-orange-700 dark:text-orange-500 mb-4">
              <Icon size={20} />
            </div>
            <h2 className="font-bold text-slate-900 dark:text-white">{title}</h2>
            <p className="mt-2 min-h-16 text-sm leading-6 text-slate-500 dark:text-zinc-550">{description}</p>
            <button
              className={connected ? "secondary-button mt-4 w-full" : "primary-button mt-4 w-full"}
              disabled={connected}
              onClick={() => connect(provider, title)}
              type="button"
            >
              {connected ? <CheckCircle2 size={15} /> : <PlugZap size={15} />}
              {connected ? "Connected" : "Connect"}
            </button>
            {provider === "gmail" && connected && (
              <button className="secondary-button mt-2 w-full" disabled={loading} onClick={syncGmail} type="button">
                <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
                {loading ? "Checking inbox..." : "Sync inbox now"}
              </button>
            )}
          </article>
        );
      })}
    </div>
  );
}
