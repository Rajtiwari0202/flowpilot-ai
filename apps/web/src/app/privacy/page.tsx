import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "ACE Privacy Policy",
  description: "Privacy policy and data protection details for ACE.",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-slate-50 dark:bg-black text-slate-900 dark:text-zinc-300 py-12 px-6 sm:px-12 lg:px-24">
      <div className="max-w-3xl mx-auto bg-white dark:bg-[#0A0A0A] border border-slate-200 dark:border-[#171717] rounded-xl p-8 shadow-sm">
        <div className="mb-8">
          <Link href="/" className="text-sm font-semibold text-orange-600 dark:text-orange-500 hover:underline">
            &larr; Back to App
          </Link>
          <h1 className="text-3xl font-bold mt-4 text-slate-900 dark:text-white">ACE Privacy Policy</h1>
          <p className="text-sm text-slate-500 dark:text-zinc-500 mt-2">Last Updated: July 2026</p>
        </div>

        <div className="space-y-6 text-sm leading-6 text-slate-700 dark:text-zinc-300">
          <section>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Information We Collect</h2>
            <p>To provide and improve our services, we collect the following types of information:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Name:</strong> Used to personalize user profiles and follow-up templates.</li>
              <li><strong>Email Address:</strong> Used for account registration, communication, and updates.</li>
              <li><strong>Google Account Information:</strong> Specifically integration metadata and tokens authorized via OAuth.</li>
              <li><strong>Workflow Data:</strong> Templates, rules, configurations, and settings created in ACE.</li>
              <li><strong>Usage Data:</strong> System logs, activity metrics, and feature interactions.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Google OAuth Access</h2>
            <p>
              ACE uses Google OAuth to authenticate users and connect Gmail integrations.
            </p>
            <div className="bg-slate-50 dark:bg-zinc-950/20 border border-slate-100 dark:border-[#171717] rounded-lg p-4 mt-3">
              <p className="font-semibold text-slate-800 dark:text-zinc-200">Requested scopes:</p>
              <ul className="list-disc pl-5 mt-1 space-y-1 text-slate-650 dark:text-zinc-405">
                <li><code>gmail.readonly</code></li>
                <li><code>gmail.send</code></li>
                <li><code>userinfo.email</code></li>
              </ul>
            </div>
            <p className="mt-3">We only use these permissions to:</p>
            <ul className="list-disc pl-5 mt-1 space-y-1">
              <li>read emails needed for workflow automation</li>
              <li>draft responses using our AI pipelines</li>
              <li>send follow-up emails approved by the user inside the approval queue</li>
            </ul>
            <p className="mt-3 font-semibold text-slate-900 dark:text-white">We never sell user data.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Data Storage</h2>
            <p>
              User data is stored securely in PostgreSQL and protected using encryption where applicable. Integrations credentials and access tokens are encrypted at-rest using advanced cryptographic primitives.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">User Rights</h2>
            <p>
              Users may revoke Google access at any time from their Google Account settings.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Contact</h2>
            <p>
              If you have any questions about this Privacy Policy, please contact us at:{" "}
              <a href="mailto:support@ace.ai" className="text-orange-600 dark:text-orange-500 hover:underline">
                support@ace.ai
              </a>
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
