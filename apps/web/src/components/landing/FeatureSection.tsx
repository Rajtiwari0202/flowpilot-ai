import { Bot, CheckCircle2, Mail, ShieldCheck, Eye } from "lucide-react";

export function FeatureSection() {
  const features = [
    {
      title: "Lead Automation",
      description: "Automatically capture and qualify leads.",
      icon: CheckCircle2,
    },
    {
      title: "AI Email Drafting",
      description: "Generate personalized responses instantly.",
      icon: Bot,
    },
    {
      title: "Approval Workflows",
      description: "Review before sending important communications.",
      icon: ShieldCheck,
    },
    {
      title: "Gmail Integration",
      description: "Connect Gmail securely with Google OAuth.",
      icon: Mail,
    },
    {
      title: "Activity Tracking",
      description: "Track every action across your workspace.",
      icon: Eye,
    },
  ];

  return (
    <section className="bg-slate-50 py-16 px-6 sm:px-12 max-w-6xl mx-auto border-t border-slate-200" aria-label="Product Features">
      <div className="mx-auto max-w-3xl text-center mb-12">
        <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">
          Streamline Your Operations
        </h2>
        <p className="mt-4 text-slate-600">
          Automate tasks, process client requests, and sync integrations using the FlowPilot engine.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {features.map((item) => {
          const Icon = item.icon;
          return (
            <article
              className="border border-slate-200 bg-white p-6 rounded-lg shadow-sm hover:border-slate-300 transition duration-150"
              key={item.title}
            >
              <div className="size-10 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center">
                <Icon size={20} />
              </div>
              <h3 className="text-base font-bold text-slate-900 mt-4">{item.title}</h3>
              <p className="text-sm text-slate-500 mt-2 leading-relaxed">{item.description}</p>
            </article>
          );
        })}
      </div>

      {/* How it Works Sub-section */}
      <div className="mt-20 border-t border-slate-200 pt-16">
        <h3 className="text-center text-xl font-bold text-slate-900 mb-10">How It Works</h3>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="text-center p-4 border border-slate-200 bg-white rounded-lg shadow-sm">
            <div className="mx-auto grid size-10 place-items-center rounded-full bg-blue-50 text-blue-600 text-sm font-extrabold">1</div>
            <h4 className="font-bold text-sm text-slate-900 mt-4">Connect Gmail</h4>
            <p className="text-xs text-slate-500 mt-2 leading-5">Link your inbox securely via Google OAuth.</p>
          </div>
          <div className="text-center p-4 border border-slate-200 bg-white rounded-lg shadow-sm">
            <div className="mx-auto grid size-10 place-items-center rounded-full bg-blue-50 text-blue-600 text-sm font-extrabold">2</div>
            <h4 className="font-bold text-sm text-slate-900 mt-4">Import Leads</h4>
            <p className="text-xs text-slate-500 mt-2 leading-5">Capture contacts and inquiry details automatically.</p>
          </div>
          <div className="text-center p-4 border border-slate-200 bg-white rounded-lg shadow-sm">
            <div className="mx-auto grid size-10 place-items-center rounded-full bg-blue-50 text-blue-600 text-sm font-extrabold">3</div>
            <h4 className="font-bold text-sm text-slate-900 mt-4">Generate AI Drafts</h4>
            <p className="text-xs text-slate-500 mt-2 leading-5">Our AI writes custom contextual replies.</p>
          </div>
          <div className="text-center p-4 border border-slate-200 bg-white rounded-lg shadow-sm">
            <div className="mx-auto grid size-10 place-items-center rounded-full bg-blue-50 text-blue-600 text-sm font-extrabold">4</div>
            <h4 className="font-bold text-sm text-slate-900 mt-4">Approve &amp; Send</h4>
            <p className="text-xs text-slate-500 mt-2 leading-5">Confirm drafts in your queue to execute dispatch.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
